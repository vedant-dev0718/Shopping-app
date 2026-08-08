plugins {
    id("com.android.application") version "8.2.2"
    kotlin("multiplatform") version "1.9.24"
    kotlin("plugin.serialization") version "1.9.24"
    id("org.jetbrains.compose") version "1.6.11"
}

kotlin {
    androidTarget()
    iosX64()
    iosArm64()
    iosSimulatorArm64()

    targets.withType<org.jetbrains.kotlin.gradle.plugin.mpp.KotlinNativeTarget>().configureEach {
        binaries.framework {
            baseName = "SharedKit"
            isStatic = true
        }
    }

    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1")
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-core:1.6.3")
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
                implementation("io.ktor:ktor-client-core:2.3.12")
                implementation("io.ktor:ktor-client-content-negotiation:2.3.12")
                implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.12")
                implementation("io.coil-kt.coil3:coil-compose:3.0.4")
                implementation("io.coil-kt.coil3:coil-network-ktor2:3.0.4")
                implementation(compose.runtime)
                implementation(compose.foundation)
                implementation(compose.material3)
                implementation(compose.ui)
            }
        }

        val iosX64Main by getting
        val iosArm64Main by getting
        val iosSimulatorArm64Main by getting

        val iosMain by creating {
            dependsOn(commonMain)
            dependencies {
                implementation("io.ktor:ktor-client-darwin:2.3.12")
                implementation("com.liftric:kvault:1.12.0")
            }
        }

        iosX64Main.dependsOn(iosMain)
        iosArm64Main.dependsOn(iosMain)
        iosSimulatorArm64Main.dependsOn(iosMain)

        val commonTest by getting {
            dependencies {
                implementation(kotlin("test"))
            }
        }

        val androidMain by getting {
            dependencies {
                implementation("androidx.activity:activity-compose:1.9.1")
                implementation("androidx.credentials:credentials:1.3.0")
                implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
                implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
                implementation("io.ktor:ktor-client-okhttp:2.3.12")
                implementation("androidx.media3:media3-exoplayer:1.3.1")
                implementation("androidx.media3:media3-exoplayer-hls:1.3.1")
                implementation("androidx.media3:media3-exoplayer-dash:1.3.1")
                implementation("androidx.media3:media3-ui:1.3.1")
            }
        }

        val androidUnitTest by getting {
            dependencies {
                implementation("junit:junit:4.13.2")
                implementation("androidx.test:core:1.6.1")
                implementation("org.robolectric:robolectric:4.15.1")
                implementation("androidx.compose.ui:ui-test-junit4:1.6.8")
                implementation("androidx.compose.ui:ui-test-manifest:1.6.8")
            }
        }
    }
}

android {
    val googleServerClientId = providers.gradleProperty("NOTWHAT_GOOGLE_SERVER_CLIENT_ID").orElse("").get()

    namespace = "com.notwhat.app"
    compileSdk = 35

    flavorDimensions += "roleApp"

    defaultConfig {
        applicationId = "com.notwhat.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        manifestPlaceholders["NOTWHAT_GOOGLE_SERVER_CLIENT_ID"] = googleServerClientId
        manifestPlaceholders["APP_NAME"] = "NotWhat"
        buildConfigField("String", "APP_ROLE", "\"\"")
    }

    productFlavors {
        create("buyer") {
            dimension = "roleApp"
            applicationIdSuffix = ".buyer"
            versionNameSuffix = "-buyer"
            manifestPlaceholders["APP_NAME"] = "NotWhat Buyer"
            buildConfigField("String", "APP_ROLE", "\"buyer\"")
        }
        create("seller") {
            dimension = "roleApp"
            applicationIdSuffix = ".seller"
            versionNameSuffix = "-seller"
            manifestPlaceholders["APP_NAME"] = "NotWhat Seller"
            buildConfigField("String", "APP_ROLE", "\"seller\"")
        }
        create("admin") {
            dimension = "roleApp"
            applicationIdSuffix = ".admin"
            versionNameSuffix = "-admin"
            manifestPlaceholders["APP_NAME"] = "NotWhat Admin"
            buildConfigField("String", "APP_ROLE", "\"admin\"")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = true
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
        }
    }
}

afterEvaluate {
    val debugUnitTestTask = tasks.findByName("testDebugUnitTest")

    if (debugUnitTestTask is Test) {
        tasks.register<Test>("testBidHostUiDebugUnitTest") {
            group = "verification"
            description = "Runs only host-side bid sheet Compose tests for Product/Reel flows."
            testClassesDirs = debugUnitTestTask.testClassesDirs
            classpath = debugUnitTestTask.classpath
            filter {
                includeTestsMatching("com.notwhat.shared.ui.BidSheetHostUiTest")
            }
        }
    } else {
        tasks.register("testBidHostUiDebugUnitTest") {
            group = "verification"
            description = "Fallback alias to run debug unit tests when isolated host suite task cannot be configured."
            dependsOn("testDebugUnitTest")
        }
    }

    tasks.register("ciAndroidSecondaryGate") {
        group = "verification"
        description = "Secondary Android gate: connected emulator checks + isolated host bid suite."
        dependsOn("connectedDebugAndroidTest", "testBidHostUiDebugUnitTest")
    }
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompilationTask<*>>().configureEach {
    compilerOptions.freeCompilerArgs.add("-Xexpect-actual-classes")
}
