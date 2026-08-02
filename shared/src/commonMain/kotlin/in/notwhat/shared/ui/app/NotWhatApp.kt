package com.notwhat.shared.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import com.notwhat.shared.session.UserRole

/** Public app entrypoint (framework layer) that delegates to the internal app shell. */
@Composable
fun NotWhatApp(
    state: NotWhatAppState = remember { NotWhatAppState() },
    forcedRole: UserRole? = null,
) {
    NotWhatAppFramework(
        state = state,
        forcedRole = forcedRole,
    )
}
