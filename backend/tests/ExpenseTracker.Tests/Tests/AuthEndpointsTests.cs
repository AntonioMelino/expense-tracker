using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ExpenseTracker.Tests.Fixtures;
using ExpenseTracker.Tests.Helpers;

namespace ExpenseTracker.Tests.Tests;

[Collection("Database")]
public class AuthEndpointsTests(TestWebApplicationFactory factory) : IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly HttpClient _client = factory.CreateClient();

    public async Task InitializeAsync() => await factory.ResetDataAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Register_ValidRequest_Returns201WithTokens()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            FullName = "Test User",
            Email = "register@test.com",
            Password = "Test1234!",
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.False(string.IsNullOrEmpty(body.GetProperty("accessToken").GetString()));
        Assert.False(string.IsNullOrEmpty(body.GetProperty("refreshToken").GetString()));
        Assert.Equal("register@test.com", body.GetProperty("user").GetProperty("email").GetString());
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns400()
    {
        await AuthHelper.RegisterAsync(_client, "dup@test.com");

        var response = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            FullName = "Another User",
            Email = "dup@test.com",
            Password = "Test1234!",
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_MissingFullName_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            FullName = "",
            Email = "missing@test.com",
            Password = "Test1234!",
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_ValidCredentials_Returns200WithTokens()
    {
        await AuthHelper.RegisterAsync(_client, "login@test.com");

        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = "login@test.com",
            Password = "Test1234!",
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.False(string.IsNullOrEmpty(body.GetProperty("accessToken").GetString()));
        Assert.False(string.IsNullOrEmpty(body.GetProperty("refreshToken").GetString()));
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        await AuthHelper.RegisterAsync(_client, "wrongpwd@test.com");

        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = "wrongpwd@test.com",
            Password = "WrongPass1!",
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_NonExistentEmail_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = "nobody@test.com",
            Password = "Test1234!",
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Refresh_ValidTokens_Returns200WithNewTokens()
    {
        var (accessToken, refreshToken) = await AuthHelper.RegisterAsync(_client, "refresh@test.com");

        var response = await _client.PostAsJsonAsync("/api/auth/refresh", new
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.False(string.IsNullOrEmpty(body.GetProperty("accessToken").GetString()));
        Assert.False(string.IsNullOrEmpty(body.GetProperty("refreshToken").GetString()));
    }

    [Fact]
    public async Task Refresh_InvalidToken_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/refresh", new
        {
            AccessToken = "not.a.valid.token",
            RefreshToken = "invalid",
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Logout_WithValidToken_Returns204()
    {
        var (accessToken, _) = await AuthHelper.RegisterAsync(_client, "logout@test.com");
        AuthHelper.SetBearerToken(_client, accessToken);

        var response = await _client.PostAsync("/api/auth/logout", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Logout_WithoutToken_Returns401()
    {
        var response = await _client.PostAsync("/api/auth/logout", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
