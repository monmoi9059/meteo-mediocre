plugins {
    id("com.android.application")
}

android {
    namespace = "ca.portquebec.stromuald.terminal"
    compileSdk = 35

    defaultConfig {
        applicationId = "ca.portquebec.stromuald.terminal"
        minSdk = 26
        targetSdk = 35
        versionCode = 310
        versionName = "3.1.0"
    }

    signingConfigs {
        create("release") {
            val ksPath = System.getenv("KEYSTORE_FILE")
            if (!ksPath.isNullOrBlank() && file(ksPath).exists()) {
                storeFile = file(ksPath)
                storePassword = System.getenv("KEYSTORE_PASSWORD") ?: "stromuald360"
                keyAlias = System.getenv("KEY_ALIAS") ?: "stromuald"
                keyPassword = System.getenv("KEY_PASSWORD") ?: "stromuald360"
                enableV1Signing = true
                enableV2Signing = true
                enableV3Signing = true
            }
        }
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            isShrinkResources = false
            val ksPath = System.getenv("KEYSTORE_FILE")
            signingConfig = if (!ksPath.isNullOrBlank() && file(ksPath).exists()) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
