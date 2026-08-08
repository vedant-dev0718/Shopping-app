package com.notwhat.shared.ui

import android.content.Context
import coil3.ImageLoader
import coil3.SingletonImageLoader
import coil3.intercept.Interceptor
import coil3.intercept.Interceptor.Chain
import coil3.request.ImageRequest
import coil3.request.ImageResult
import coil3.network.ktor2.KtorNetworkFetcherFactory
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp

// Rewrites localhost/127.0.0.1 URLs to 10.0.2.2 so the emulator can reach the host
private object LocalhostRewriteInterceptor : Interceptor {
    override suspend fun intercept(chain: Chain): ImageResult {
        val rawUrl = chain.request.data.toString()
        return if (rawUrl.contains("//localhost:") || rawUrl.contains("//127.0.0.1:")) {
            val rewritten = rawUrl
                .replace("//localhost:", "//10.0.2.2:")
                .replace("//127.0.0.1:", "//10.0.2.2:")
            val newRequest = chain.request.newBuilder().data(rewritten).build()
            chain.withRequest(newRequest).proceed()
        } else {
            chain.proceed()
        }
    }
}

internal fun initCoilForAndroid(context: Context) {
    SingletonImageLoader.setSafe {
        ImageLoader.Builder(context)
            .components {
                add(LocalhostRewriteInterceptor)
                add(KtorNetworkFetcherFactory(HttpClient(OkHttp)))
            }
            .build()
    }
}
