package expo.modules.nativedoh

import android.content.Context

object DohPreferences {
    private const val PREFERENCES_NAME = "lnreader_network"
    private const val PROVIDER_KEY = "doh_provider"

    fun getProvider(context: Context): Int =
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getInt(PROVIDER_KEY, DohProviders.DISABLED)

    fun setProvider(context: Context, provider: Int) {
        require(provider in DohProviders.ALL) { "Unknown DNS over HTTPS provider: $provider" }
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putInt(PROVIDER_KEY, provider)
            .commit()
    }
}
