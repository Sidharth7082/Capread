package expo.modules.nativevolumebuttonlistener

import android.view.KeyEvent
import android.view.Window
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NativeVolumeButtonListenerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NativeVolumeButtonListener")

    Events("VolumeUp", "VolumeDown")

    Function("setActive") { active: Boolean ->
      isActive = active
    }

    OnCreate {
      Companion.module = this@NativeVolumeButtonListenerModule
    }

    OnActivityEntersForeground {
      setupKeyInterceptor(appContext)
    }

    OnDestroy {
      Companion.cleanup()
    }
  }

  companion object {
    var module: NativeVolumeButtonListenerModule? = null
    var isActive = false
    private var attachedWindow: Window? = null
    private var interceptor: Window.Callback? = null
    private var originalCallback: Window.Callback? = null

    fun sendEvent(up: Boolean) {
      if (!isActive) return
      val eventName = if (up) "VolumeUp" else "VolumeDown"
      module?.sendEvent(eventName, mapOf<String, Any?>())
    }

    private fun setupKeyInterceptor(appContext: AppContext) {
      if (interceptor != null) return
      val activity = appContext.currentActivity ?: return
      val window = activity.window ?: return
      val previousCallback = window.callback ?: return
      // The wrapped callback is captured locally. Reading a shared mutable field
      // here would make a stale wrapper delegate back to itself after a re-attach
      // that could not restore the original callback, causing infinite
      // dispatchKeyEvent recursion (StackOverflowError) on the next key event.
      val wrapper = object : Window.Callback by previousCallback {
        override fun dispatchKeyEvent(event: KeyEvent): Boolean {
          if (isActive && event.action == KeyEvent.ACTION_DOWN) {
            when (event.keyCode) {
              KeyEvent.KEYCODE_VOLUME_UP -> {
                sendEvent(true)
                return true
              }
              KeyEvent.KEYCODE_VOLUME_DOWN -> {
                sendEvent(false)
                return true
              }
            }
          }
          return previousCallback.dispatchKeyEvent(event)
        }
      }
      originalCallback = previousCallback
      interceptor = wrapper
      attachedWindow = window
      window.callback = wrapper
    }

    private fun cleanup() {
      // Restore only when this exact wrapper is still the window callback, so a
      // callback installed afterwards (e.g. by the dev client) is not clobbered.
      val window = attachedWindow
      val wrapper = interceptor
      if (window != null && wrapper != null && window.callback === wrapper) {
        originalCallback?.let { window.callback = it }
      }
      module = null
      isActive = false
      attachedWindow = null
      interceptor = null
      originalCallback = null
    }
  }
}
