# Status items in the dock

A plugin can show up to four items in the dock's status area, beside the clock
and the battery: a signal meter, a sync state.

```kotlin
setStatusItem(StatusItem("wifi", icon = bitmap, label = "Wi-Fi: strong", text = "5G"))
removeStatusItem("wifi")

override fun onStatusItemClicked(id: String) { }
```

- **`id`** is the plugin's own name for the item. Setting the same id again
  replaces it, so update it as often as its state changes.
- **`icon`** is drawn about 28 px tall, and sent at most 96 px. By default it
  is tinted to the dock's text colour from its alpha, as the battery is, so draw
  it white on transparent; pass `tinted = false` to keep its colours.
- **`label`** is what hovering it says, and **`text`** a few characters beside
  it.

Set items from `onCreate` or later, on the main thread. Ones set before the
shell connects appear once it does. They go when the plugin is disabled or its
process stops, and a restarted plugin sets them again from `onCreate`.

## A signal meter

The sample's
[`SampleProvider`](https://github.com/HaloneXR/halone-examples/blob/main/plugin-sample/src/main/java/dev/halone/plugin/sample/SampleProvider.kt)
draws a four-bar meter and steps it on each click. Its `apps()` and
`createSession()` are left out here:

```kotlin
class SampleProvider : PanelProviderService() {
    private var level = 2

    override fun onCreate() {
        super.onCreate()
        showLevel()
    }

    override fun onStatusItemClicked(id: String) {
        level = (level + 1) % (BARS + 1)
        showLevel()
    }

    private fun showLevel() = setStatusItem(
        StatusItem(METER, meter(level), label = "$level of $BARS bars. Click to change.", text = "S$level"),
    )

    private fun meter(filled: Int): Bitmap {
        val bitmap = Bitmap.createBitmap(METER_PX, METER_PX, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val gap = METER_PX / 16f
        val width = (METER_PX - gap * (BARS - 1)) / BARS
        for (i in 0 until BARS) {
            paint.color = Color.argb(if (i < filled) 255 else 70, 255, 255, 255)
            val left = i * (width + gap)
            canvas.drawRoundRect(left, METER_PX * (1 - (i + 1f) / BARS), left + width, METER_PX.toFloat(), gap, gap, paint)
        }
        return bitmap
    }

    companion object {
        private const val METER = "meter"
        private const val METER_PX = 64
        private const val BARS = 4
    }
}
```

The bars are white at full or partial alpha, so the dock tints them like its
own icons.
