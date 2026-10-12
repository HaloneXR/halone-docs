# ADR 0002: Panels own their pose, texture, engine and follow state

**Status:** accepted · **Date:** 2026-08-23

## Context

The stereo path was built by going straight at the hardware, which was the right
call — it retired the risks that could have invalidated the design, and several
of them were real. The cost was that everything above `core-glasses` ended up
inside the spike, and the parts that mattered ended up inside one class.

`StereoRenderer` owned a single `PanelPose`, a single `SmoothFollow`, a single
`panelYaw`, a single texture and the hit test against that one panel. The
`Activity` around it had grown to 1400 lines and reached into the renderer for
every experiment. None of that was wrong for one panel. All of it was in the way
of two:

- **Following is per-panel by nature.** A reference document should stay where it
  was left; the panel being worked in should come along. As a renderer-wide mode
  that choice cannot be expressed, and a following panel needs *its own*
  heading, not the renderer's.
- **A cursor must be occluded by a nearer panel.** With one panel there is
  nothing to be occluded by, so the question never came up and the cursor was
  drawn depth-test-free — correct then, wrong the moment a second panel exists.
- **Panel creation is a two-phase handshake across threads** in both engines, for
  unrelated reasons: a `SurfaceTexture` needs a live GL context, and both
  `GeckoDisplay.acquireDisplay` and `VirtualDisplay` + `Presentation` assert the
  UI thread. With one panel that was a lambda passed to the renderer's
  constructor. With N panels arriving and leaving at runtime it is a protocol.

## Decision

Extract three modules — `core-display`, `core-compositor`, `engine-webview` —
and move panel state into a panel record.

1. **`Panel` owns pose, heading, follow state, engine and texture.** Its heading
   lives in `PanelPose.yawRadians`, which smooth follow mutates, alongside a
   `slotYawRadians` it returns to on a recentre.
2. **`Scene` owns the panel list, focus, layout and hit testing.** Hit testing
   returns the *nearest* panel it landed on, along with the distance, so
   "nothing under the cursor" and "something nearer" are both representable.
   Focus follows the pointer.
3. **`Scene` and `Panel` are pure arithmetic** — no GL, no Android. The
   behaviour that decides whether the environment feels solid (deadzone,
   follow rate, ray-to-pixel mapping) is therefore unit-tested off-device.
4. **`StereoCompositor` owns the camera, the projection and the frame**, and
   draws whatever the scene contains. It knows nothing about any one panel.
5. **`PanelEngine` is the surface-source interface**: `createTexture` on the
   render thread, `attach` on the UI thread, panel-pixel input, `close`. The
   compositor drives the handshake for panels that join at any time.
6. **`core-display` owns getting pixels to the glasses**: discovery, the
   mode-switch dance that recreates the display, and hosting a render surface.

## Consequences

**Good.** Multi-panel is now a matter of adding to a scene. Pinned versus
follows-me is expressible per panel, which is what `halone.windows.*` will need to
expose. The cursor-occlusion bug is designed out rather than deferred: the ray
never reaches the panel behind a nearer one. 18 new unit tests cover hit
testing, following and angular sizing, none of which needed hardware. The spike
`Activity` no longer reaches into a renderer's internals; its stereo session is
40 lines of ordering.

**Costs.** Three more modules, and one indirection between the compositor and
its pixels. A panel that joins the scene is attached on the *next* frame rather
than synchronously, so there is a frame or two where a panel exists and has no
texture — every draw path has to tolerate that.

**Deliberately deferred.** `engine-gecko` is not extracted; `GeckoPanel`
implements `PanelEngine` and stays in the spike until the browser panel is real
work rather than a proof.

## Addendum: the collision policy, decided by wearing it

The first version deferred what happens when a follower is carried onto a pinned
neighbour. Worn, it took minutes to become the most obvious problem in the scene,
so it is now `Scene.CollisionPolicy`, defaulting to `AVOID_PINNED`.

Three things settled it, and only the first was obvious in advance:

- **Depth is not available to resolve it in.** The optics form the virtual image
  at one fixed distance, so nudging a panel nearer or further to dodge a
  neighbour trades an overlap for a vergence/accommodation conflict. Elevation is
  no better: the vertical field is 19°, and a panel filling 75% of it has nowhere
  to go. Resolution has to be in yaw.
- **Therefore "the follower wins" is not a distinct option.** In yaw, winning
  *is* overlapping. The real question is only whether pinned panels are
  obstacles, which is why the policy has three values and not four.
- **Pinning governs the resting place, not the journey.** A follower that simply
  clamps gets stuck against the obstacle's edge for as long as the wearer keeps
  turning — there is no way around it in yaw — which breaks the one promise
  following makes, exactly when the wearer turns to bring the panel along. So a
  follower crosses over a pinned panel while catching up, and is pushed clear
  only once its destination is the thing that is occupied. The overlap is
  transient and self-resolving.

## Addendum: following belongs to the arrangement

Wearing the two-panel scene forced a second revision, larger than the first. The
decision recorded above — that a panel owns its follow state — stands, but
**whether to follow is not a per-panel question**:

- The band that keeps a panel world-locked is measured from the **arrangement's
  extent**, not from each panel's slot. A per-panel band means looking straight at
  a panel 15° off centre already exceeds it, so the layout slides over to put its
  *gap* in front of the wearer. Derived from angular width, the band also scales
  itself: a wide panel earns a wide one, which no fixed number can.
- The band decides only when to **start**. Panels report their own arrival,
  because a follower parked clear of a pinned neighbour is deliberately not at its
  slot, so "everyone is at their slot" cannot be the settled test.
- The **deadzone is a gate, not a stopping point**. Stopping at its edge made the
  resting place depend on the direction of approach.
- The return is **anchored on the panel the wearer last looked at**, so what they
  were reading comes back in front of them. That is distinct from the focus used
  for input routing, which defaults to the first panel added.
- A **layout change is a command, not a head movement**: pinning or re-spacing
  moves panels regardless of the band, and re-lays out only what still follows —
  a pinned panel keeps its place.

`Panel` still owns pose, slot, engine and `SmoothFollow`; `Scene` owns when the
arrangement moves and where it is allowed to rest. The full model, and the ten or
so wrong versions of it that a wearer caught, are in [Following, layout and collisions](../multi-panel).

## Notes

Keeping `GeckoPanel` as a second implementation of `PanelEngine` was worth more
than extracting it would have been. The interface was designed against the
WebView path, and Gecko is the one that proves the two-phase handshake is
inherent rather than an artefact of `VirtualDisplay`.
