using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ExpenseTracker.Api.Dtos.Auth;
using ExpenseTracker.Domain.Entities;
using ExpenseTracker.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;

namespace ExpenseTracker.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", Register);
        group.MapPost("/login", Login);
        group.MapPost("/refresh", Refresh);
        group.MapPost("/logout", Logout).RequireAuthorization();

        return app;
    }

    private static async Task<IResult> Register(
        RegisterRequest request,
        UserManager<ApplicationUser> userManager,
        IJwtService jwtService,
        IConfiguration config,
        CancellationToken ct)
    {
        var validationErrors = ValidateRegisterRequest(request);
        if (validationErrors.Count > 0)
            return Results.ValidationProblem(validationErrors);

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName.Trim(),
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = result.Errors.ToDictionary(e => e.Code, e => new[] { e.Description });
            return Results.ValidationProblem(errors);
        }

        var (accessToken, refreshToken) = await IssueTokens(user, userManager, jwtService, config);
        return Results.Created(
            $"/api/auth/{user.Id}",
            new AuthResponse(accessToken, refreshToken, new UserDto(user.Id, user.Email!, user.FullName)));
    }

    private static async Task<IResult> Login(
        LoginRequest request,
        UserManager<ApplicationUser> userManager,
        IJwtService jwtService,
        IConfiguration config,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return Results.Unauthorized();

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
            return Results.Unauthorized();

        var (accessToken, refreshToken) = await IssueTokens(user, userManager, jwtService, config);
        return Results.Ok(new AuthResponse(
            accessToken, refreshToken, new UserDto(user.Id, user.Email!, user.FullName)));
    }

    private static async Task<IResult> Refresh(
        RefreshRequest request,
        UserManager<ApplicationUser> userManager,
        IJwtService jwtService,
        IConfiguration config,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.AccessToken) || string.IsNullOrWhiteSpace(request.RefreshToken))
            return Results.Unauthorized();

        var principal = jwtService.GetPrincipalFromExpiredToken(request.AccessToken);
        if (principal is null)
            return Results.Unauthorized();

        var userId = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (userId is null)
            return Results.Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user is null)
            return Results.Unauthorized();

        var tokenHash = jwtService.HashRefreshToken(request.RefreshToken);
        if (user.RefreshTokenHash != tokenHash || user.RefreshTokenExpiry < DateTime.UtcNow)
            return Results.Unauthorized();

        var (newAccessToken, newRefreshToken) = await IssueTokens(user, userManager, jwtService, config);
        return Results.Ok(new TokensResponse(newAccessToken, newRefreshToken));
    }

    private static async Task<IResult> Logout(
        ClaimsPrincipal principal,
        UserManager<ApplicationUser> userManager,
        CancellationToken ct)
    {
        var userId = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (userId is null)
            return Results.Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user is null)
            return Results.Unauthorized();

        user.RefreshTokenHash = null;
        user.RefreshTokenExpiry = null;
        await userManager.UpdateAsync(user);

        return Results.NoContent();
    }

    private static async Task<(string AccessToken, string RefreshToken)> IssueTokens(
        ApplicationUser user,
        UserManager<ApplicationUser> userManager,
        IJwtService jwtService,
        IConfiguration config)
    {
        var refreshTokenDays = int.Parse(config["Jwt:RefreshTokenDays"] ?? "7");
        var accessToken = jwtService.GenerateAccessToken(user);
        var refreshToken = jwtService.GenerateRefreshToken();

        user.RefreshTokenHash = jwtService.HashRefreshToken(refreshToken);
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(refreshTokenDays);
        await userManager.UpdateAsync(user);

        return (accessToken, refreshToken);
    }

    private static Dictionary<string, string[]> ValidateRegisterRequest(RegisterRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(request.FullName))
            errors["fullName"] = ["Full name is required"];
        if (string.IsNullOrWhiteSpace(request.Email))
            errors["email"] = ["Email is required"];
        if (string.IsNullOrWhiteSpace(request.Password))
            errors["password"] = ["Password is required"];
        return errors;
    }
}
