package expo.modules.nativedoh

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NativeDohModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("NativeDoh")

        Function("getProvider") {
            DohPreferences.getProvider(appContext.reactContext!!)
        }

        Function("setProvider") { provider: Int ->
            DohPreferences.setProvider(appContext.reactContext!!, provider)
        }
    }
}
