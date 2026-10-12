# The phone's keyboard

The wearer types on the phone's on-screen keyboard. Nothing comes up while a
physical keyboard is connected; its keys arrive in `onKeyEvent` as always.

## In View mode

A `ViewPanelSession` needs nothing. When a text field takes focus, the phone's
keyboard comes up and types into that field through its own
`InputConnection`, so composition, suggestions and corrections work as on the
phone. It goes away when focus leaves the field or the keyboard's Done key is
pressed, and a tap on the field brings it back after the wearer puts it away.

## In Surface mode

A `PanelSession` asks for the keyboard and applies its edits itself:

```kotlin
host.showKeyboard(KeyboardRequest(hint = "Search", state = KeyboardState(text, cursor)))
```

`KeyboardRequest` takes the field's `inputType` and `imeOptions`, as an
`EditorInfo` gives them (a single-line text field with a Done key by default),
a `hint`, and the field's current `state`: its text and selection.

The keyboard's edits arrive in `onTextInput` as a `TextInputEvent`. They
mirror `InputConnection`'s calls, with positions in UTF-16 units of the
field's text:

| Event | Meaning |
|---|---|
| `Commit(text, newCursorPosition)` | Replace the composing text, or the selection, with `text` |
| `Compose(text, newCursorPosition)` | The same, and keep it composing |
| `ComposingRegion(start, end)` | Mark the existing text from `start` to `end` as composing |
| `FinishComposing` | The composing text stays as it is |
| `DeleteSurrounding(before, after)` | Delete `before` units before the selection and `after` after it |
| `Select(start, end)` | Move the selection |
| `EditorAction(actionId)` | The keyboard's action key: an `EditorInfo.IME_ACTION_*` |
| `Dismissed` | The wearer put the keyboard away |

Keys the keyboard sends as keys (delete, and enter on some keyboards) arrive in
`onKeyEvent` instead.

The shell keeps a copy of the field for the keyboard's suggestions. After any
change the keyboard did not make, such as a tap moving the cursor or a physical
key, tell it what the field holds now:

```kotlin
host.updateKeyboard(KeyboardState(text, selectionStart, selectionEnd))
```

`host.hideKeyboard()` puts it away.

## A one-line editor

The sample's
[`PatternSession`](https://github.com/HaloneXR/halone-examples/blob/main/plugin-sample/src/main/java/dev/halone/plugin/sample/PatternSession.kt)
keeps the cursor at the end of a single line, which is enough to apply every
event:

```kotlin
private var typed = ""
private var composingStart = -1
private var composingEnd = -1
private var keyboardUp = false

private fun toggleKeyboard() {
    keyboardUp = !keyboardUp
    if (keyboardUp) host.showKeyboard(KeyboardRequest(hint = "Type here", state = KeyboardState(typed)))
    else host.hideKeyboard()
}

override fun onTextInput(event: TextInputEvent) {
    when (event) {
        is TextInputEvent.Commit -> {
            replaceComposing(event.text)
            composingStart = -1
        }
        is TextInputEvent.Compose -> {
            val start = replaceComposing(event.text)
            composingStart = start
            composingEnd = start + event.text.length
        }
        is TextInputEvent.ComposingRegion -> {
            composingStart = event.start.coerceIn(0, typed.length)
            composingEnd = event.end.coerceIn(composingStart, typed.length)
        }
        TextInputEvent.FinishComposing -> composingStart = -1
        is TextInputEvent.DeleteSurrounding -> replace(maxOf(0, typed.length - event.before), typed.length, "")
        is TextInputEvent.Select -> Unit
        is TextInputEvent.EditorAction -> {
            keyboardUp = false
            host.hideKeyboard()
        }
        TextInputEvent.Dismissed -> keyboardUp = false
    }
}

private fun replaceComposing(text: String): Int {
    val start = if (composingStart >= 0) composingStart else typed.length
    val end = if (composingStart >= 0) composingEnd else typed.length
    replace(start, end, text)
    return start
}

private fun replace(start: Int, end: Int, text: String) {
    typed = typed.substring(0, start) + text + typed.substring(end)
}
```

When a physical key changes `typed` in `onKeyEvent`, the sample clears the
composing region and calls `host.updateKeyboard(KeyboardState(typed))` while
the keyboard is up.
