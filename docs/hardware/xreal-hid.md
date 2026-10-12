# XREAL Air-series USB HID protocol

Transcribed from the open-source reference drivers
([nrealAirLinuxDriver](https://github.com/UnrealXR/nrealAirLinuxDriver),
[ar-drivers-rs](https://github.com/badicsalex/ar-drivers-rs)) and then
**confirmed on a real XREAL Air 2 Pro** (Galaxy S26 Ultra, Android 16) by spike
S1. Corrections found on device are marked **[measured]**. The original XREAL
Air has since been checked too: tracking, the stereo mode switch and
brightness work on it unchanged.

The reference drivers talk to the glasses through hidapi/hidraw, which writes
raw report bytes with no report-ID prefix. On Android we reproduce that with
`UsbDeviceConnection` + `claimInterface(force = true)` and interrupt transfers
on the interface's own endpoints, which is byte-for-byte equivalent.

## Identification

Vendor ID `0x3318`.

| Product              | PID      | IMU iface | MCU iface | IMU max payload |
|----------------------|----------|-----------|-----------|-----------------|
| **XREAL Air**        | `0x0424` | **3**     | **4**     | **64**          |
| XREAL Air 2          | `0x0428` | 3         | 4         | 64              |
| **XREAL Air 2 Pro**  | `0x0432` | **3**     | **4**     | **64**          |
| XREAL Air 2 Ultra    | `0x0426` | 2         | 0         | 512             |

Interface numbers are `bInterfaceNumber`, not the index passed to
`UsbDevice.getInterface(i)` — match on `UsbInterface.getId()`.

**[measured]** An Air 2 Pro enumerates 9 interfaces (audio 0–2, HID 3–6). The
ones that matter, with their endpoints:

| iface | class | IN | OUT | role |
|-------|-------|----|-----|------|
| 3 | HID | `0x84` | `0x05` | IMU sensor stream |
| 4 | HID | `0x86` | `0x07` | MCU control |
| 5 | HID | `0x88` | `0x09` | unidentified |
| 6 | HID | `0x8a` (3-byte) | — | likely the HID consumer-control buttons |

## Checksum

Standard zlib/IEEE CRC-32: reflected table, init `0xFFFFFFFF`, final
complement. `java.util.zip.CRC32` produces exactly this value.

In both packet families the checksum covers the bytes **starting at the
`length` field** and running for `length` bytes — i.e. `length` itself is
included in its own checksummed range, and the 4 checksum bytes are not.

## IMU interface (iface 3)

### Command packet — head `0xAA`

| Field    | Offset | Type    | Value                    |
|----------|--------|---------|--------------------------|
| head     | 0      | u8      | `0xAA`                   |
| checksum | 1      | u32 LE  | crc32 over `length…data` |
| length   | 5      | u16 LE  | `3 + dataLen`            |
| msgid    | 7      | u8      | see below                |
| data     | 8      | bytes   | `dataLen` bytes          |

Total bytes written: `8 + dataLen`.

| msgid  | Meaning                       |
|--------|-------------------------------|
| `0x14` | get calibration data length   |
| `0x15` | get next calibration segment  |
| `0x19` | start/stop IMU stream (`0x01`/`0x00`) |
| `0x1A` | get static id                 |

Startup sequence used by the reference driver: send `0x19` with `0x00`
(stop), read the ack, optionally pull the calibration blob, then send `0x19`
with `0x01` (start) and read the ack. Each ack is a reply packet with the
same msgid.

### Sensor packet — 64 bytes, signature `0x01 0x02`

| Field                    | Offset | Type   |
|--------------------------|--------|--------|
| signature                | 0      | u8[2] — `0x01 0x02` |
| temperature              | 2      | u16 LE |
| timestamp                | 4      | u64 LE |
| angular multiplier       | 12     | u16 LE |
| angular divisor          | 14     | u32 LE |
| angular velocity x/y/z   | 18/21/24 | i24 LE each |
| acceleration multiplier  | 27     | u16 LE |
| acceleration divisor     | 29     | u32 LE |
| acceleration x/y/z       | 33/36/39 | i24 LE each |
| magnetic multiplier      | 42     | u16 LE |
| magnetic divisor         | 44     | u32 LE |
| magnetic x/y/z           | 48/50/52 | i16 LE each |
| checksum                 | 54     | u32 LE |
| padding                  | 58     | u8[6]  |

Scaling is carried **in the packet**, so nothing needs hardcoding:

- gyro (rad/s) = `toRadians(raw * multiplier / divisor)`
- accel (m/s²) = `(raw * multiplier / divisor) * 9.81`
- magnetometer is the same shape (units still to be confirmed)

A signature of `0xAA 0x53` marks a non-sensor/ack packet on this endpoint and
must be skipped rather than treated as an error. **[measured]** That test is
really "head `0xAA`, then the checksum's low byte" — command replies on this
endpoint echo the command framing (`head 0xAA`, checksum, length, msgid), so
match on `0xAA` at offset 0 and read the msgid at offset 7 rather than relying
on `0x53`.

### [measured] Observations on an Air 2 Pro at rest

- **Rate: ~994 Hz.** 9940 samples in 10s with zero malformed packets, zero
  unrecognised signatures and zero read timeouts.
- **Gyro/accel offsets and the packet-carried scaling are exactly as above** —
  verified byte-by-byte against a captured frame. Typical scaling: gyro
  `mult=4000 div=16777216` (degrees/count), accel `mult=32 div=16777216`
  (g/count).
- **The accelerometer reads ~1.03 g at rest** (a +3.3% scale error). Harmless
  for our purposes because the fusion filter normalises the gravity direction
  and only uses its direction, but it means the accel is not trustworthy as an
  absolute magnitude without the calibration blob.
- **Gyro bias is significant: `[0.35, -0.01, 0.47] °/s`.** The 0.47°/s yaw bias
  alone produces ~28°/min of drift, which matched the measured free-running
  yaw drift of ~0.44°/s. **Bias estimation is mandatory, not an optimisation.**
- **The checksum field in sensor packets is always zero**, so frames cannot be
  validated by checksum — the signature is the only integrity check available.
- **Magnetometer fields are unsigned and biased at `0x8000`**, not two's
  complement like gyro/accel. At rest: raw `0x7FAB/0x8018/0x8172` →
  `-85/+24/+370` counts. The packet's mag `mult=32768 div=1024` yields a
  scale of 32, which produces implausible magnitudes, so **the mag scale
  convention remains unknown**. The reference drivers never implemented this
  sensor.

  It is no longer parked. The official runtime (Nebula for Mac 0.8.1)
  fuses the magnetometer on every device family (`UseMagnetic` defaults true),
  with Mahalanobis gating and an outlier-count reset — which is the structural
  fix for yaw drift that recentring only papers over. Two prerequisites before
  that is worth attempting: the sensor may need enabling over the MCU
  (`CMD_RW_MAG_SWITCH 0x55`, or `MSG_W_MAG_CALIBR_DATA 0x1C` on the newer
  protocol), and the glasses store their own mag calibration at `0x1B`, so
  hard-iron correction does not have to be solved from scratch.

  The counts are now published as `TrackingSample.Inertial.magnetRaw` —
  de-biased, unscaled, still in the hardware axis frame. The `magcheck` spike
  uses them to answer the only question that matters first: does the field move
  when the head does, or is the sensor switched off.

### [measured] Calibration blob transfer (msgid `0x14` / `0x15`)

**Confirmed on an Air 2 Pro.** The transfer works exactly as guessed, and the
blob is **JSON**, not the protobuf the teardown predicted:

1. Send `0x14`. The reply payload is a **little-endian u32** total size.
2. Send `0x15` repeatedly. Each reply carries the **next slice in order**, no
   offset or sequence number, until the total is reached.

Replies use the IMU reply framing — the command header echoed back, msgid at
offset 7, payload at offset 8, `length` counting the msgid and the two length
bytes. A 64-byte frame therefore holds at most **56 payload bytes**.

**[measured]** 38862 bytes in **696 replies in 1.8 s**, arriving as valid UTF-8
JSON that parses whole, ending in `}` with no padding. The `FSN` field matches
the `Glasses ID` the official app logs for this unit, which is as good a
confirmation of a clean transfer as we are going to get without a checksum.

Note the size disagrees with the official app's `Read config 54313 bytes` for
the same glasses. Ours parses completely and self-consistently, so this is not a
truncation; the runtime is probably reading into a padded or differently framed
buffer. Not worth chasing.

Two things that matter when implementing it:

- **The transfer and the sensor stream share one endpoint.** They cannot
  overlap: the read loop would eat the command replies. The driver stops the
  stream for the duration and restarts it afterwards.
- **Sensor frames keep arriving after the stream is stopped.** Anything that is
  not a `0xAA`-headed reply with the expected msgid must be skipped, not treated
  as data — a sensor frame mistaken for a segment corrupts the blob silently,
  and there is no checksum to catch it.

`calib` dumps the blob plus a hex log of every reply.
[`tools/walk-calibration.py`](https://github.com/HaloneXR/halone/blob/main/tools/walk-calibration.py) reports on it. A real capture from this unit is
checked in at
[`android/core-glasses/src/test/resources/calibration-air2pro-E434X00248.json`](https://github.com/HaloneXR/halone/blob/main/android/core-glasses/src/test/resources/calibration-air2pro-E434X00248.json),
with its raw reply log beside it.

### [measured] What the blob contains

Top-level keys: `FSN`, `IMU`, `RGB_camera`, `SLAM_camera`, `display`,
`display_distortion`, `configuration_file_version`, `glasses_ID`,
`glasses_version`, `last_modified_time`. On this unit: config version 5.0,
calibrated 2024-08-31, 1 IMU, **0 RGB and 0 SLAM cameras** — which is the blob
confirming in its own words that this is 3DoF hardware.

**`display`** — per-eye pinhole intrinsics as a 3x3 row-major matrix
(`k_left_display`, `k_right_display`), `resolution` `[1920, 1080]`, and each
eye's pose relative to the IMU (`target_p_*_display` in metres,
`target_q_*_display` as a Hamilton quaternion `(qx,qy,qz,qw)`).
`target_type` says what the poses are relative to: `"IMU"`.

| | left | right |
|---|---|---|
| fx, fy | 2691.43, 2705.31 | 2689.94, 2703.82 |
| principal point | 964.04, 560.22 | 965.40, 561.49 |
| horizontal FoV | 39.261° | 39.281° |
| vertical FoV | 22.575° | 22.587° |
| diagonal FoV | 44.464° | 44.486° |

The frustum is **asymmetric**: the principal point sits ~20 px above centre, so
the upper half-angle is 11.70° against 10.88° below — 0.823° of asymmetry that
a symmetric projection cannot express at all.

**IPD is 63.66 mm** on this unit, from the eye separation, against our 63 mm
default. The displays are also **not square to the IMU**: roll −0.98°/−1.01°,
pitch +0.93°/+0.05°, yaw +0.61°/+0.65°. Our `Optics.imuPitchOffsetDegrees` is
0, and the roll term is the larger one anyway.

**`IMU.device_1`** — the part that matters most:

| field | value on this unit |
|---|---|
| `accel_bias` | `[0.0282, -0.2758, 0.0126]` m/s² |
| `gyro_bias` | `[-0.004863, -0.007449, 0.000533]` rad/s = `[-0.279, -0.427, 0.031]` °/s |
| `scale_accel`, `scale_gyro` | `[1,1,1]` — identity |
| `skew_accel`, `skew_gyro` | `[0,0,0]` — identity |
| `imu_noises` | `[0.00035, 1e-05, 0.00667, 0.00068]` |
| `accel_q_gyro` | identity |
| `gyro_q_mag` | `[-0.5, 0.5, -0.5, 0.5]` — a 90° rotation |
| `mag_bias`, `scale_mag` | zero / identity — **no factory mag calibration** |

### [measured] The factory IMU frame is not the sensor packet frame

The blob documents the convention for its quaternions and says nothing about
its bias vectors, and applying them as if they shared the packet's axes makes
**both** sensors worse. They do not: Y and Z are exchanged and all three axes
negated, i.e. `(x, y, z) → (−x, −z, −y)`. That is a proper rotation, so the
ordinary "subtract the bias" convention then applies.

Found by searching all 24 proper signed permutations against a stationary
reading, and confirmed on a second reading taken later:

| | uncorrected | this mapping | next-best mapping |
|---|---|---|---|
| gyro residual at rest | 0.573 °/s | **0.084 °/s** | 0.194 °/s |
| accelerometer `\|a\|` error | 0.342 m/s² | **0.069 m/s²** | — |

The accelerometer is the convincing part: the mapping was fitted to the gyro
alone, so its agreement is independent evidence, and the margin over the
runner-up is more than 2x on data with three degrees of freedom.

Two corrections to earlier notes fall out of this:

- **The accelerometer error was a bias all along, read in the wrong frame.**
  `scale_accel` really is exactly `[1,1,1]`, and once the frame is right the
  rest-magnitude error drops from **3.5% to 0.7%** — 10.152 m/s² becomes
  9.879. The earlier suspicion of an uncorrected sensitivity error was wrong.
  This still matters for the stillness detector, which was rebuilt around
  "compare against the device's own resting magnitude, learned": that is the
  right shape for a scale error, and a bias is constant in the *sensor* frame,
  so the resting magnitude depends on orientation. Applying the bias first
  makes the learned magnitude nearly orientation-free, which is what that code
  wanted in the first place.
- **Our measured gyro bias is confirmed by the factory's**, to 0.084 °/s after
  two years and an unknown thermal history. Both have the same distinctive
  shape: two significant components and one near zero.

`calibcheck` performs this comparison against whatever is attached and reports
which sign convention wins, rather than leaving it inferred. Run it with the
glasses resting on a table — it discards any sample above ~1.1 °/s, and worn,
almost none qualify.

**`display_distortion`** — `type: 1`, an **18 x 32 grid of 4-tuples**,
row-major, 2304 floats per eye:

```
[ideal_x, ideal_y, actual_x, actual_y]     all in pixels
```

`ideal` samples the 1920x1080 frame on a regular but non-uniform grid (0, 90,
150, 210, … — denser at the edges); `actual` is where that point really lands,
and runs slightly outside the frame (−15.4 to 1936.2). Displacement is **at most
20.8 px, mean 3.9 px — about 1% of frame width**.

That last number is worth dwelling on: the distortion is small. It is **not**
large enough to reconcile a 19° rendering FoV with a 22.6° calibrated one — and
it did not need to. See below.

**Applied.** The scene renders into an offscreen texture per eye and is drawn
to the display through a mesh built from this grid. Chosen over no correction
in a blind A/B while worn, both rounds. It is worth 0.44° at the corners and needs 1.3% of
overfill, because the warp samples outside the rendered frame.

## MCU interface (iface 4)

### Command packet — head `0xFD` (note: different from the IMU's `0xAA`)

| Field     | Offset | Type   | Value                    |
|-----------|--------|--------|--------------------------|
| head      | 0      | u8     | `0xFD`                   |
| checksum  | 1      | u32 LE | crc32 over `length…data` |
| length    | 5      | u16 LE | `17 + dataLen`           |
| timestamp | 7      | u64 LE | `0` is accepted          |
| msgid     | 15     | u16 LE | see below                |
| reserved  | 17     | u8[5]  | zeroed                   |
| data      | 22     | bytes  | `dataLen` bytes          |

Total bytes written: `22 + dataLen`. Reply packets are 64 bytes and use
`length = 18 + dataLen`.

**[measured] Replies are laid out one byte later than commands.** That extra
byte in the length is a **status byte at offset 22** (`0` = OK), with the
payload starting at **offset 23**. Reading a reply's payload at 22 silently
returns the status and therefore always looks like `0`.

**[measured] The MCU multiplexes unsolicited packets onto the same IN
endpoint** — heartbeats, button events and async text logs in the `0x6C__`
msgid range. A bare read after a command returns whichever packet was queued
first, not the answer, so a reader **must drain until `msgid` matches** the
request. Without that filter, display-mode reads return plausible-looking
garbage from an unrelated packet.

| msgid    | Meaning                    |
|----------|----------------------------|
| `0x03`   | read brightness            |
| `0x04`   | write brightness           |
| `0x07`   | read display mode          |
| `0x08`   | **write display mode**     |
| `0x15`   | read glass id              |
| `0x1A`   | heartbeat                  |
| `0x6C05` | async: button pressed (`MSG_E_KEY`) |
| `0x6C04` | async: proximity sensor (`MSG_E_PSENSOR`) — **not** a display toggle, as this table said until the vendor's own message names were read |
| `0x1A`   | heartbeat / clock round trip |

### Display mode byte (msgid `0x08`)

This is the mechanism behind stereo — **SBS is settable in software**, so the
manual *Power + Brightness-Up* chord is only a fallback.

| Value | Mode                                        |
|-------|---------------------------------------------|
| 1     | SameOnBoth — 1920x1080 mirrored to both eyes |
| 3     | Stereo / full SBS — 3840x1080, left half = left eye |
| 4     | Full SBS @ 72Hz                             |
| 5     | Mirror @ 72Hz                               |
| 8     | HalfSBS — presents 1920x1080, internally 960x540 per eye |
| 9     | Full SBS @ 90Hz                             |
| 10    | Mirror @ 90Hz                               |
| 11    | Mirror @ 120Hz                              |

Mode **3** is what the compositor wants. Confirm per-firmware which of
3/4/9 the Air 2 Pro actually accepts, and that the host then sees a matching
`Display.Mode` (spikes S2/S3).

The MCU also emits unsolicited event packets for the physical buttons and for
display-mode changes made with the hardware chord, so the shell can react to
the user toggling modes behind its back.

## The vsync interface (5) [measured]

The device exposes **three** 64-byte HID interfaces, and the vendor's libraries
name them: `imu interface`, `sdk interface` and `vsync interface`. We had been
using two. Interface **5** is the third, and it reports display timing.

| Interface | Endpoints | What it is |
|---|---|---|
| 3 | `0x84` IN / `0x05` OUT | IMU, sensor stream and calibration blob |
| 4 | `0x86` IN / `0x07` OUT | MCU: display mode, brightness, events, heartbeat |
| 5 | `0x88` IN / `0x09` OUT | display timing beacons |
| 6 | `0x8a` IN, 3-byte | unidentified; too small for anything here |

Interface 5 **does not use the MCU framing**, and matches neither message table
compiled into the vendor's libraries — neither the string protocol
(`0x20200316`) nor the binary one (`0x20210601`, which is otherwise exactly our
msgid table). It sends this, unprompted, with nothing enabled:

```
fd 14 00 00 00 00 00 00  70 ad 1f 43 16 00 00 00  90 4d fe 00 ...
^  ^                     ^-------- u64 --------^  ^--- u32 --^
|  counter, +1 per packet  device time, ns          refresh period, ns
head
```

**One packet per 256 refreshes**, about every 4.27 s. That is not a vsync
interrupt, it is a timing beacon — and it is the better deal: phase and period
are all a refresh grid needs, and a 256-frame baseline measures the period far
more precisely than consecutive frames could.

The reading validates itself three ways: consecutive timestamps are 256 periods
apart to a part in 10⁴, the timestamp is a plausible uptime in nanoseconds, and
the period is 16.666 ms. Measured against the beacon spacing the true period is
**16.666673 ms (60.0000 Hz)**; the period *field* says 16.666 or 16.667 ms and
varies between packets, so it is nominal.

`MSG_W_VSYNC_FUCTION` (`0x02`) on the MCU is sent anyway, in case something has
switched the beacons off, but **[measured]** they arrive without it.

## The clock round trip — `MSG_W_HEARTBEAT` `0x1A` [measured]

The device timestamps are useless until they can be placed against ours. The
heartbeat is an NTP exchange with the device's own two timestamps filled in:

| Field | Offset | |
|---|---|---|
| `host_timestamp` | 0 | ours, going out |
| `viewer_recv_timestamp` | 8 | theirs, on receiving |
| `viewer_send_timestamp` | 16 | theirs, on replying |

```
offset = ((recv − sent) + (replied − heard)) / 2
delay  = (heard − sent) − (replied − recv)
```

Subtracting the device's own turnaround is what makes this better than halving
a round trip: the time the firmware spent thinking is measured rather than
charged to the wire. **[measured]** 20/20 answered, round trip **0.7–2 ms**, so
the offset is pinned to well under a millisecond, and the offset estimate
repeats to **0.6 ms** across a burst.

**The IMU and the display controller share one clock.** That is the fact the
whole thing rests on, and it is what makes the beacons directly comparable with
sensor timestamps with no conversion at all. Verified by magnitude and by the
offset being stable while both advance.

## Axis convention [measured]

XREAL's IMU frame is **not** the canonical frame. Measured with the glasses
worn: level, gravity reads hardware **+Z**; chin down, it moves onto hardware
**+Y**. So hw +Z is up and hw +Y is backward, and right-handedness forces the
rest:

```kotlin
AxisConvention(xFrom = X_NEG, yFrom = Z_POS, zFrom = Y_POS)   // canonical = (-hwX, hwZ, hwY)
```

Determinant +1, so it is a proper rotation and the gyro needs no extra sign
flip.

## Resolved by S1
- Command framing, checksum range and CRC variant are correct as documented —
  the device acks both IMU and MCU commands built to this spec.
- Sensor rate is ~994 Hz over interrupt transfers on Android.
- The magnetometer is populated but its scale is unknown; unused by design.

## Still open
- **How much of the remaining 2.13°/min is gyro scale error.** The magnetometer
  took worn drift from 9.91°/min to 2.13°/min. Roughly half
  the original was residual gyro bias; the rest grows with total rotation
  rather than with time, which points at scale rather than bias, and nothing
  corrects it.
- The magnetometer scale convention. The blob does not answer it —
  `scale_mag` is identity and `mag_bias` is zero, so there is no factory mag
  calibration stored. `MSG_R_MAG_CALIBR_DATA 0x1B` on the MCU may hold one.
- **Whether the factory IMU frame mapping is the vendor's convention or this
  unit's accident.** One pair of glasses, two measurements. A second unit
  settles it.
- The role of HID interface 6 — a 3-byte IN endpoint, most likely the buttons
  as a standard HID consumer control. Interface 5 is now identified (above).

## Resolved on hardware
- **The `0x14`/`0x15` framing is right**, and the blob is JSON. 38862 bytes in
  696 replies in 1.8 s, parsing whole.
- **The magnetometer is live without any enable command.** Over a slow head
  turn while worn: x spread 61 counts, **y spread 295**, z spread 42. It
  responds to yaw, which is the axis that drifts.
- **It bounds yaw drift rather than removing it**: over ten minutes worn and
  moving, ~19° against the ~99° the gyro alone reaches. On by default. Short
  runs flatter it badly — two minutes gives 0.58°/min, which does not
  extrapolate.
- **`gyro_q_mag` is used exactly as stored**, converted only into the canonical
  frame. Conjugating it (the blob calls it JPL) and passing it through the
  factory IMU frame were both wrong, and cost a factor of four in drift.
- **Neither hard-iron nor soft-iron correction is applied.** No constant offset
  fits — the best one sits on whatever bound the search is given, at every
  bound, on held-out data. A soft-iron matrix improves field-magnitude
  constancy while making heading *worse*, which is the evidence the model is
  wrong rather than merely hard to fit. An EKF magnetic-bias state is the same
  model estimated online and would not help either.
- **The factory IMU frame** maps to the packet frame as `(x, y, z) → (−x, −z, −y)`.
- **The calibrated asymmetric frustum is correct**, by blind A/B while worn.
  Ranked by how much a pinned panel appeared to rotate as the gaze crossed it:
  calibrated 22.58° asymmetric (best, chosen both rounds) > legacy 19°
  symmetric > symmetrised 23.40° centred (clearly worst).

  The ordering is the finding. The wide field of view is only right *with* the
  off-centre principal point — apply either alone and it is worse than both.
  Which is why nulling by hand landed on 19°: a narrower symmetric frustum is
  the best available compensation for an asymmetry a symmetric projection
  cannot express. So 19° stays as the no-calibration fallback, and is not
  "wrong" so much as the right answer to a different question.

## Resolved by the Nebula teardown
- **The calibration blob is needed.** It carries the per-eye FoV we measured by
  hand as 37.7°, the factory accelerometer correction behind our 3.4% rest-magnitude
  error, and factory gyro bias — so it replaces a guess, a workaround and a
  one-minute wait.
- **The accel scale error is per-unit calibration, not a units mistake.** The
  official runtime's own constant is `gravity = 9.8`, a 0.07% difference from
  ours and far too small to explain the gap.
