# Drawing with a Canvas

A `PanelSession` in Surface mode draws into the window's `Surface` itself. This
is the shape of the sample's
[`PatternSession`](https://github.com/HaloneXR/halone-examples/blob/main/plugin-sample/src/main/java/dev/halone/plugin/sample/PatternSession.kt):
a hardware `Canvas`, redrawn on every display frame with `Choreographer`, that
draws a trail where the wearer drags and a ring where the pointer hovers.

```kotlin
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PointF
import android.view.Choreographer
import android.view.MotionEvent
import android.view.Surface
import dev.halone.plugin.PanelSession

class SketchSession : PanelSession(), Choreographer.FrameCallback {
    private var surface: Surface? = null
    private val trail = ArrayList<PointF>()
    private var hover: PointF? = null
    private val line = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }

    override fun onAttach(surface: Surface) {
        this.surface = surface
        host.setTitle("Sketch")
        Choreographer.getInstance().removeFrameCallback(this)
        Choreographer.getInstance().postFrameCallback(this)
    }

    override fun onDetach() = stop()

    override fun onClose() = stop()

    private fun stop() {
        Choreographer.getInstance().removeFrameCallback(this)
        surface = null
    }

    override fun onMotionEvent(event: MotionEvent) {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                trail.clear()
                trail += PointF(event.x, event.y)
            }
            MotionEvent.ACTION_MOVE, MotionEvent.ACTION_UP -> trail += PointF(event.x, event.y)
            MotionEvent.ACTION_HOVER_MOVE -> hover = PointF(event.x, event.y)
            MotionEvent.ACTION_HOVER_EXIT -> hover = null
        }
    }

    override fun doFrame(frameTimeNanos: Long) {
        val target = surface ?: return
        val canvas = runCatching { target.lockHardwareCanvas() }.getOrNull()
        if (canvas != null) {
            draw(canvas)
            target.unlockCanvasAndPost(canvas)
        }
        Choreographer.getInstance().postFrameCallback(this)
    }

    private fun draw(canvas: Canvas) {
        canvas.drawColor(Color.rgb(0x18, 0x1a, 0x20))
        if (trail.size > 1) {
            val path = Path().apply {
                moveTo(trail[0].x, trail[0].y)
                trail.drop(1).forEach { lineTo(it.x, it.y) }
            }
            line.color = Color.rgb(0xff, 0x45, 0x8a)
            line.strokeWidth = 10f
            canvas.drawPath(path, line)
        }
        hover?.let {
            line.color = Color.rgb(0x7f, 0xd1, 0xae)
            line.strokeWidth = 3f
            canvas.drawCircle(it.x, it.y, 18f, line)
        }
    }
}
```

Things to get right:

- **Stop on `onDetach` as well as `onClose`.** On `onDetach` the surface goes
  away while the window is hidden; keep the drawing state, and start again in
  the next `onAttach`, which brings a new surface.
- **`widthPx` and `heightPx`** are the surface's size. They are set before
  `onAttach` and `onResize`; a frame loop like this one picks them up on its
  own.
- **Copy from the `MotionEvent`.** It is recycled when `onMotionEvent`
  returns.
- `lockHardwareCanvas` can throw while the surface is being torn down, hence
  the `runCatching`.

Register it like any other session:

```kotlin
override fun createSession(appId: String, args: Bundle): PanelSession? = when (appId) {
    "sketch" -> SketchSession()
    else -> null
}
```

## The rest of the input

`onKeyEvent` gets physical keyboard keys, and `onContextMenu(x, y)` a request
for a context menu. The wheel arrives as `ACTION_SCROLL`:

```kotlin
MotionEvent.ACTION_SCROLL -> wheel += event.getAxisValue(MotionEvent.AXIS_VSCROLL)
```

To take text from the phone's keyboard, see
[The phone's keyboard](./keyboard).
