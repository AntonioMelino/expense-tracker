namespace ExpenseTracker.Api.Dtos.Auth;

public record RegisterRequest(string FullName, string Email, string Password);

public record LoginRequest(string Email, string Password);

public record RefreshRequest(string AccessToken, string RefreshToken);

public record UserDto(string Id, string Email, string FullName);

public record AuthResponse(string AccessToken, string RefreshToken, UserDto User);

public record TokensResponse(string AccessToken, string RefreshToken);

public record UpdateProfileRequest(string FullName);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
