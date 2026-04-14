package xyz.rigby3.lightweight.ui.screens.register

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import retrofit2.HttpException
import xyz.rigby3.lightweight.data.auth.GoogleSignInHelper
import xyz.rigby3.lightweight.data.repository.AuthRepository
import javax.inject.Inject

data class RegisterState(
    val username: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
)

sealed interface RegisterEvent {
    data object Success : RegisterEvent
}

@HiltViewModel
class RegisterViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val googleSignInHelper: GoogleSignInHelper,
) : ViewModel() {

    private val _state = MutableStateFlow(RegisterState())
    val state: StateFlow<RegisterState> = _state.asStateFlow()

    private val _events = MutableSharedFlow<RegisterEvent>()
    val events: SharedFlow<RegisterEvent> = _events.asSharedFlow()

    fun updateUsername(value: String) {
        _state.update { it.copy(username = value, error = null) }
    }

    fun updatePassword(value: String) {
        _state.update { it.copy(password = value, error = null) }
    }

    fun register() {
        val s = _state.value
        if (s.username.isBlank() || s.password.isBlank()) {
            _state.update { it.copy(error = "Username and password required") }
            return
        }
        if (s.isLoading) return

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                authRepository.register(s.username.trim(), s.password)
                _events.emit(RegisterEvent.Success)
            } catch (e: HttpException) {
                val msg = when (e.code()) {
                    409 -> "Username already taken"
                    400 -> "Username must be 3-20 characters, password 8+"
                    else -> "Registration failed"
                }
                _state.update { it.copy(isLoading = false, error = msg) }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = "Registration failed") }
            }
        }
    }

    fun googleSignIn(activityContext: Context) {
        if (_state.value.isLoading) return

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val credential = googleSignInHelper.getGoogleCredential(activityContext)
                authRepository.googleSignIn(credential.idToken, credential.displayName, credential.email)
                _events.emit(RegisterEvent.Success)
            } catch (e: Exception) {
                _state.update { it.copy(
                    isLoading = false,
                    error = "Google sign-in failed",
                ) }
            }
        }
    }
}
