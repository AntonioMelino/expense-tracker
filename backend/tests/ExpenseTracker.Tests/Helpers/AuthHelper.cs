using System.Net.Http.Json;
using System.Text.Json;

namespace ExpenseTracker.Tests.Helpers;

public static class AuthHelper
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static async Task<(string AccessToken, string RefreshToken)> RegisterAsync(
        HttpClient client,
        string email,
        string password = "Test1234!",
        string fullName = "Test User")
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            FullName = fullName,
            Email = email,
            Password = password,
        }, JsonOptions);

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        return (
            body.GetProperty("accessToken").GetString()!,
            body.GetProperty("refreshToken").GetString()!
        );
    }

    public static void SetBearerToken(HttpClient client, string accessToken) =>
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
}
