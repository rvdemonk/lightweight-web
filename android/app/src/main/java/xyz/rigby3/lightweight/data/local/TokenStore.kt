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

    var displayName: String?
        get() = prefs.getString("display_name", null)
        set(value) = prefs.edit().putString("display_name", value).apply()

    var email: String?
        get() = prefs.getString("email", null)
        set(value) = prefs.edit().putString("email", value).apply()

    var userId: Long
        get() {
            val stored = prefs.getLong("user_id", 0L)
            // Upgrade path: existing installs had hardcoded user_id=1.
            // If logged in but userId was never set, default to 1.
            if (stored == 0L && token != null) return 1L
            return stored
        }
        set(value) = prefs.edit().putLong("user_id", value).apply()

    var autoSyncEnabled: Boolean
        get() = prefs.getBoolean("auto_sync_enabled", false)
        set(value) = prefs.edit().putBoolean("auto_sync_enabled", value).apply()

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
}
