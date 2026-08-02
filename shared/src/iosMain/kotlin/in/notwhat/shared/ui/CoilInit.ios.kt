package com.notwhat.shared.ui

import coil3.ImageLoader
import coil3.PlatformContext
import coil3.SingletonImageLoader
import coil3.network.ktor2.KtorNetworkFetcherFactory
import io.ktor.client.HttpClient
import io.ktor.client.engine.darwin.Darwin

/** Must be called once before any image is loaded on iOS. */
@OptIn(coil3.annotation.DelicateCoilApi::class)
internal fun initCoilForIos() {
    SingletonImageLoader.setUnsafe(
        ImageLoader.Builder(PlatformContext.INSTANCE)
            .components {
                add(KtorNetworkFetcherFactory(HttpClient(Darwin)))
            }
            .build(),
    )
}
