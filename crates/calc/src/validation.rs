/// Validation error types — no dependency on database or HTTP.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ValidationError {
    PasswordTooShort,
    InvalidUsername(String),
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ValidationError::PasswordTooShort => write!(f, "Password must be at least 8 characters"),
            ValidationError::InvalidUsername(msg) => write!(f, "{}", msg),
        }
    }
}

impl std::error::Error for ValidationError {}

/// Validate password meets minimum requirements.
pub fn validate_password(password: &str) -> Result<(), ValidationError> {
    if password.len() < 8 {
        return Err(ValidationError::PasswordTooShort);
    }
    Ok(())
}

/// Validate and normalize username. Returns the lowercased username on success.
/// Rules: 3-20 characters, alphanumeric and underscores only.
pub fn validate_username(username: &str) -> Result<String, ValidationError> {
    let lowered = username.to_lowercase();
    if lowered.len() < 3 || lowered.len() > 20 {
        return Err(ValidationError::InvalidUsername(
            "Username must be 3-20 characters".to_string(),
        ));
    }
    if !lowered
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_')
    {
        return Err(ValidationError::InvalidUsername(
            "Username must contain only alphanumeric characters and underscores".to_string(),
        ));
    }
    Ok(lowered)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---------------------------------------------------------------
    // validate_password
    // ---------------------------------------------------------------

    #[test]
    fn password_min_length() {
        assert!(validate_password("1234567").is_err());
        assert!(validate_password("12345678").is_ok());
    }

    #[test]
    fn password_empty() {
        assert!(validate_password("").is_err());
    }

    #[test]
    fn password_exactly_7_chars() {
        assert!(validate_password("abcdefg").is_err());
    }

    #[test]
    fn password_exactly_8_chars() {
        assert!(validate_password("abcdefgh").is_ok());
    }

    #[test]
    fn password_exactly_9_chars() {
        assert!(validate_password("abcdefghi").is_ok());
    }

    #[test]
    fn password_very_long() {
        assert!(validate_password(&"x".repeat(1000)).is_ok());
    }

    #[test]
    fn password_whitespace_only() {
        // 8 spaces should pass — length check is on raw bytes, spaces are valid chars
        assert!(validate_password("        ").is_ok());
    }

    #[test]
    fn password_7_spaces() {
        assert!(validate_password("       ").is_err());
    }

    #[test]
    fn password_unicode_chars() {
        // Unicode characters can be multi-byte; .len() counts bytes, not chars
        // "abcdefg" + one 2-byte char = 9 bytes >= 8 => Ok
        assert!(validate_password("abcdefgé").is_ok());
    }

    #[test]
    fn password_short_unicode_byte_length() {
        // 4 emoji chars: each is 4 bytes = 16 bytes total, >= 8 => Ok
        assert!(validate_password("\u{1F600}\u{1F601}\u{1F602}\u{1F603}").is_ok());
    }

    #[test]
    fn password_error_type() {
        let err = validate_password("short").unwrap_err();
        assert_eq!(err, ValidationError::PasswordTooShort);
        assert_eq!(err.to_string(), "Password must be at least 8 characters");
    }

    #[test]
    fn password_with_special_chars() {
        assert!(validate_password("p@$$w0rd!").is_ok());
    }

    // ---------------------------------------------------------------
    // validate_username
    // ---------------------------------------------------------------

    #[test]
    fn username_length_bounds() {
        assert!(validate_username("ab").is_err());
        assert!(validate_username("abc").is_ok());
        assert!(validate_username(&"a".repeat(20)).is_ok());
        assert!(validate_username(&"a".repeat(21)).is_err());
    }

    #[test]
    fn username_valid_chars() {
        assert!(validate_username("lewis_01").is_ok());
        assert!(validate_username("test-user").is_err());
        assert!(validate_username("test user").is_err());
    }

    #[test]
    fn username_lowercased() {
        assert_eq!(validate_username("Lewis").unwrap(), "lewis");
        assert_eq!(validate_username("UPPER").unwrap(), "upper");
    }

    #[test]
    fn username_empty() {
        assert!(validate_username("").is_err());
    }

    #[test]
    fn username_single_char() {
        assert!(validate_username("a").is_err());
    }

    #[test]
    fn username_two_chars() {
        assert!(validate_username("ab").is_err());
    }

    #[test]
    fn username_exactly_3_chars() {
        let result = validate_username("abc");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "abc");
    }

    #[test]
    fn username_exactly_20_chars() {
        let name = "a".repeat(20);
        let result = validate_username(&name);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), name);
    }

    #[test]
    fn username_exactly_21_chars() {
        assert!(validate_username(&"a".repeat(21)).is_err());
    }

    #[test]
    fn username_whitespace_only() {
        // 3 spaces: length check passes, but chars are not alphanumeric or underscore
        assert!(validate_username("   ").is_err());
    }

    #[test]
    fn username_with_leading_trailing_spaces() {
        assert!(validate_username(" abc ").is_err());
    }

    #[test]
    fn username_all_underscores() {
        assert!(validate_username("___").is_ok());
    }

    #[test]
    fn username_all_digits() {
        assert!(validate_username("123").is_ok());
    }

    #[test]
    fn username_mixed_case_normalization() {
        assert_eq!(validate_username("LeWiS").unwrap(), "lewis");
        assert_eq!(validate_username("ABC123").unwrap(), "abc123");
        assert_eq!(validate_username("Test_User").unwrap(), "test_user");
    }

    #[test]
    fn username_unicode_rejected() {
        // Unicode letters should fail since only ASCII alphanumeric + underscore allowed
        assert!(validate_username("café").is_err());
        assert!(validate_username("naïve").is_err());
    }

    #[test]
    fn username_unicode_length_boundary() {
        // "aaé" is 3 chars but 4 bytes. .len() on a String counts bytes.
        // After lowercasing, "aaé" = 4 bytes => len check passes (3 < 4 <= 20)
        // But 'é' is not ASCII alphanumeric => fails char check
        assert!(validate_username("aaé").is_err());
    }

    #[test]
    fn username_special_chars_rejected() {
        assert!(validate_username("foo@bar").is_err());
        assert!(validate_username("foo.bar").is_err());
        assert!(validate_username("foo#bar").is_err());
        assert!(validate_username("foo!bar").is_err());
    }

    #[test]
    fn username_hyphen_rejected() {
        assert!(validate_username("my-name").is_err());
    }

    #[test]
    fn username_error_messages() {
        let too_short = validate_username("ab").unwrap_err();
        assert_eq!(
            too_short,
            ValidationError::InvalidUsername("Username must be 3-20 characters".to_string())
        );

        let bad_chars = validate_username("a b").unwrap_err();
        assert_eq!(
            bad_chars,
            ValidationError::InvalidUsername(
                "Username must contain only alphanumeric characters and underscores".to_string()
            )
        );
    }

    #[test]
    fn username_error_display() {
        let err = ValidationError::InvalidUsername("test message".to_string());
        assert_eq!(err.to_string(), "test message");

        let err = ValidationError::PasswordTooShort;
        assert_eq!(err.to_string(), "Password must be at least 8 characters");
    }

    #[test]
    fn username_tab_and_newline_rejected() {
        assert!(validate_username("ab\tc").is_err());
        assert!(validate_username("ab\nc").is_err());
    }

    #[test]
    fn username_already_lowercase() {
        assert_eq!(validate_username("lewis").unwrap(), "lewis");
    }
}
