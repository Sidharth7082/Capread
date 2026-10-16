package expo.modules.nativedoh

import com.facebook.react.modules.network.OkHttpClientProvider
import java.net.InetAddress
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.dnsoverhttps.DnsOverHttps

object DohProviders {
    const val DISABLED = 0
    const val CLOUDFLARE = 1
    const val GOOGLE = 2
    const val ADGUARD = 3
    const val QUAD9 = 4
    const val ALIDNS = 5
    const val DNSPOD = 6
    const val DNS_360 = 7
    const val QUAD_101 = 8
    const val MULLVAD = 9
    const val CONTROL_D = 10
    const val NJALLA = 11
    const val SHECAN = 12

    val ALL = DISABLED..SHECAN
}

data class DohProvider(
    val url: String,
    val bootstrapHosts: List<String>,
)

private val providers = mapOf(
    DohProviders.CLOUDFLARE to DohProvider(
        "https://cloudflare-dns.com/dns-query",
        listOf(
            "162.159.36.1",
            "162.159.46.1",
            "1.1.1.1",
            "1.0.0.1",
            "162.159.132.53",
            "2606:4700:4700::1111",
            "2606:4700:4700::1001",
            "2606:4700:4700::0064",
            "2606:4700:4700::6400",
        ),
    ),
    DohProviders.GOOGLE to DohProvider(
        "https://dns.google/dns-query",
        listOf(
            "8.8.4.4",
            "8.8.8.8",
            "2001:4860:4860::8888",
            "2001:4860:4860::8844",
        ),
    ),
    DohProviders.ADGUARD to DohProvider(
        "https://dns-unfiltered.adguard.com/dns-query",
        listOf(
            "94.140.14.140",
            "94.140.14.141",
            "2a10:50c0::1:ff",
            "2a10:50c0::2:ff",
        ),
    ),
    DohProviders.QUAD9 to DohProvider(
        "https://dns.quad9.net/dns-query",
        listOf("9.9.9.9", "149.112.112.112", "2620:fe::fe", "2620:fe::9"),
    ),
    DohProviders.ALIDNS to DohProvider(
        "https://dns.alidns.com/dns-query",
        listOf("223.5.5.5", "223.6.6.6", "2400:3200::1", "2400:3200:baba::1"),
    ),
    DohProviders.DNSPOD to DohProvider(
        "https://doh.pub/dns-query",
        listOf("1.12.12.12", "120.53.53.53"),
    ),
    DohProviders.DNS_360 to DohProvider(
        "https://doh.360.cn/dns-query",
        listOf(
            "101.226.4.6",
            "218.30.118.6",
            "123.125.81.6",
            "140.207.198.6",
            "180.163.249.75",
            "101.199.113.208",
            "36.99.170.86",
        ),
    ),
    DohProviders.QUAD_101 to DohProvider(
        "https://dns.twnic.tw/dns-query",
        listOf("101.101.101.101", "2001:de4::101", "2001:de4::102"),
    ),
    DohProviders.MULLVAD to DohProvider(
        "https://dns.mullvad.net/dns-query",
        listOf("194.242.2.2", "2a07:e340::2"),
    ),
    DohProviders.CONTROL_D to DohProvider(
        "https://freedns.controld.com/p0",
        listOf("76.76.2.0", "76.76.10.0", "2606:1a40::", "2606:1a40:1::"),
    ),
    DohProviders.NJALLA to DohProvider(
        "https://dns.njal.la/dns-query",
        listOf("95.215.19.53", "2001:67c:2354:2::53"),
    ),
    DohProviders.SHECAN to DohProvider(
        "https://free.shecan.ir/dns-query",
        listOf("178.22.122.100", "185.51.200.2"),
    ),
)

fun installDohClientFactory(context: android.content.Context, providerId: Int) {
    val provider = providers[providerId] ?: return
    val applicationContext = context.applicationContext

    OkHttpClientProvider.setOkHttpClientFactory {
        val builder = OkHttpClientProvider.createClientBuilder(applicationContext)
        builder.dns(
            DnsOverHttps.Builder()
                .client(builder.build())
                .url(provider.url.toHttpUrl())
                .bootstrapDnsHosts(
                    *provider.bootstrapHosts
                        .map(InetAddress::getByName)
                        .toTypedArray(),
                )
                .build(),
        )
        builder.build()
    }
}
