package xyz.rigby3.lightweight.data.local

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenStore @Inject constructor(
    @ApplicationContext context: Context
) {
    private val prefs = context.getSharedPreferences("lw_auth", Context.MODE_PRIVATE)

    var token: String?
        get() = prefs.getString("token", null)
        set(value) = prefs.edit().putString("token", value).apply()

    var username: String?
        get() = prefs.getString("username", null)
        set(value) = prefs.edit().putString("username", value).apply()

    var isDarkTheme: Boolean
        get() = prefs.getBoolean("dark_theme", true)
        set(value) = prefs.edit().putBoolean("dark_theme", value).apply()

    val isLoggedIn: Boolean
        get() = token != null

    /** Epoch seconds when the workout was auto-paused (survives process death). */
    var pausedAtEpoch: Long
        get() = prefs.getLong("paused_at_epoch", 0L)
        set(value) = prefs.edit().putLong("paused_at_epoch", value).apply()

    fun clearPausedAt() = prefs.edit().remove("paused_at_epoch").apply()

    fun clear() {
        prefs.edit().clear().apply()
    }

    companion object {
        /** Single user on device — all Room entities use this user_id. */
        const val LOCAL_USER_ID = 1L
    }
}
