package com.notwhat.shared.ui

import coil3.ImageLoader
import coil3.PlatformContext
import coil3.SingletonImageLoader
import coil3.network.ktor2.KtorNetworkFetcherFactory
import io.ktor.client.HttpClient
import io.ktor.client.engine.darwin.Darwin
import io.ktor.client.plugins.DefaultRequest
import io.ktor.http.HttpHeaders

private val iosImageHttpClient by lazy {
    HttpClient(Darwin) {
        followRedirects = true
        install(DefaultRequest) {
            headers.append(HttpHeaders.UserAgent, "NotWhat-iOS/1.0")
            headers.append(HttpHeaders.Accept, "image/*,*/*;q=0.8")
        }
    }
}

/** Must be called once before any image is loaded on iOS. */
@OptIn(coil3.annotation.DelicateCoilApi::class)
internal fun initCoilForIos() {
    SingletonImageLoader.setSafe {
        ImageLoader
            .Builder(PlatformContext.INSTANCE)
            .components {
                add(KtorNetworkFetcherFactory(iosImageHttpClient))
            }.build()
    }
}
