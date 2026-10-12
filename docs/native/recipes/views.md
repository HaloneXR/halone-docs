# Android views

A `ViewPanelSession` shows ordinary Android views. They live on a private
virtual display in the plugin's process, hardware accelerated, and taps,
drags, scrolls, the wheel, hover and physical keys reach them as on a phone
screen. This is the shape of the sample's
[`ViewsSession`](https://github.com/HaloneXR/halone-examples/blob/main/plugin-sample/src/main/java/dev/halone/plugin/sample/ViewsSession.kt).

```kotlin
import android.content.Context
import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import dev.halone.plugin.ViewPanelSession

class NotesSession(private val provider: MyProvider, private val index: Int) : ViewPanelSession() {
    private lateinit var size: TextView
    private var pinned = false

    override fun onCreateView(context: Context): View {
        host.setTitle("Notes $index")
        host.setBackButton(true)

        val column = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
        }
        size = TextView(context).also(column::addView)
        updateSize()

        val field = EditText(context).apply {
            hint = "Title"
            inputType = InputType.TYPE_CLASS_TEXT
            setSingleLine()
        }
        column.addView(field)
        column.addView(Button(context).apply {
            text = "Use as title"
            setOnClickListener { host.setTitle(field.text.toString().ifBlank { "Notes $index" }) }
        })
        column.addView(Button(context).apply {
            text = "Pin"
            setOnClickListener {
                pinned = !pinned
                host.setPinned(pinned)
                text = if (pinned) "Unpin" else "Pin"
            }
        })
        column.addView(Button(context).apply {
            text = "Wider"
            setOnClickListener { host.requestResize(widthPx + 200, heightPx) }
        })
        column.addView(Button(context).apply {
            text = "New window"
            setOnClickListener {
                provider.openPanel("notes", Bundle().apply { putInt("index", index + 1) })
            }
        })

        return ScrollView(context).apply {
            setBackgroundColor(Color.rgb(0x16, 0x18, 0x1d))
            addView(column)
        }
    }

    override fun onResize() {
        super.onResize()
        updateSize()
    }

    override fun onBack() {
        host.close()
    }

    private fun updateSize() {
        if (::size.isInitialized) size.text = "$widthPx × $heightPx at $densityDpi dpi"
    }
}
```

```kotlin
override fun createSession(appId: String, args: Bundle): PanelSession? = when (appId) {
    "notes" -> NotesSession(this, args.getInt("index", 1))
    else -> null
}
```

Things to know:

- **`onCreateView` runs once.** The views are kept while the window is hidden,
  and a resize lays them out again rather than building them anew.
- **Call `super.onResize()`** if you override `onResize`, and likewise for
  `onAttach`, `onDetach`, `onClose`, `onMotionEvent`, `onKeyEvent`,
  `onTextInput` and `onContextMenu`: `ViewPanelSession` uses them to run the
  views.
- **The theme** is `Theme_DeviceDefault_NoActionBar`. Override `themeResId` to
  inflate the views with another.
- **Text fields work with the phone's keyboard** with nothing more to do: see
  [The phone's keyboard](./keyboard).
- **A context menu request** long-presses the innermost view under the point
  that takes one, or opens its context menu:

```kotlin
label.setOnLongClickListener {
    label.text = "Context menu asked for"
    true
}
```

- **`args`** come from `openPanel` or `launchApp`, or are empty when the wearer
  opens the app from the launcher.
