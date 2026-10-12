# ADR 0001: A vendor-neutral driver layer for XR glasses

**Status:** accepted · **Date:** 2026-08-22

## Context

The project began targeting one device, the XREAL Air 2 Pro. It is intended to
be open sourced, and the useful lifetime of the software is longer than the
useful lifetime of any one pair of glasses. Several other USB-C display glasses
exist (Rokid, VITURE, RayNeo, Grawoow), all with reverse-engineered or
documented protocols, and an existing multi-vendor driver — `XRLinuxDriver` —
demonstrates that one abstraction can absorb at least four of them.

Vendor differences are not superficial:

- **Packet framing** is entirely different per vendor.
- **Some devices stream raw IMU data; others fuse on-device** and report an
  orientation. XREAL is the former; Rokid and VITURE the latter.
- **Display modes** differ in count, resolution (3840x1080 vs 3840x1200) and
  whether stereo exists at all.
- **IMU axis conventions and mounting angles** differ, and getting a sign wrong
  makes tracking feel subtly wrong rather than obviously broken.
- Optional features — brightness, buttons, magnetometer, 6DoF — vary.

## Decision

Introduce `core-glasses`: a vendor-neutral API with per-vendor drivers behind it.

1. **Drivers never touch Android USB APIs.** They are handed `HidTransport`
   objects (`read`/`write` on raw bytes) by a `HidTransportProvider`.
2. **Tracking is modelled as a sealed type** — `TrackingSample.Inertial` or
   `TrackingSample.Oriented` — and a shared `HeadTracker` owns bias estimation,
   gravity correction, recentring and prediction for both.
3. **A canonical device frame** (+X right, +Y up, +Z toward the wearer,
   right-handed) that drivers remap into via a declared `AxisConvention`.
4. **Optional features are nullable sub-interfaces** (`DisplayControl?`,
   `BrightnessControl?`), not capability booleans beside methods that throw.
5. **Display modes are described, not enumerated**: a `StereoLayout` plus
   resolution and refresh, with the firmware's mode byte private to the driver.
   Modes carry a `verified` flag and selection prefers verified modes.
6. **Registration is an explicit list** in `GlassesRegistry.default()`.
7. **A reusable `GlassesDriverContract` test suite**, runnable with no hardware
   via `ReplayHidTransport` over recorded packet captures.

## Consequences

**Good.** Adding a device is one class plus one line. Contributors can develop
and test against captures without us owning the hardware, and can prove
correctness mechanically. The compositor and input layers never learn a vendor
name. Fusion improvements benefit every raw-IMU device at once.

**Costs.** More indirection than talking to one device directly, and an extra
module. The transport abstraction assumes "raw bytes over a claimed interface";
a device needing control transfers or a vendor SDK that owns its threads will
require extending the transport layer, not just adding a driver.

**Deliberately deferred.** 6DoF is representable (`providesPosition`) but not
consumed. Magnetometer data is parsed for diagnostics but unused: its scale
convention on XREAL is unknown, and yaw is anchored by recentring instead.

## Notes

Two things this refactor surfaced that pure design work would not have:

- The gravity-correction term still assumed a Z-up world after the canonical
  frame was declared Y-up. It drove a perfectly still device to a 90° error.
  Unit tests caught it; a design review would not have.
- `preferredStereoMode()` originally picked the highest refresh rate, choosing
  an *unverified* 90Hz mode over the 60Hz one confirmed on hardware. That is
  what motivated the `verified` flag.
