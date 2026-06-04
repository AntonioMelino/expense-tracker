using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ExpenseTracker.Tests.Fixtures;
using ExpenseTracker.Tests.Helpers;

namespace ExpenseTracker.Tests.Tests;

[Collection("Database")]
public class CategoryEndpointsTests(TestWebApplicationFactory factory) : IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly HttpClient _client = factory.CreateClient();

    public async Task InitializeAsync() => await factory.ResetDataAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<string> AuthenticateAsync(string email = "cat@test.com")
    {
        var (token, _) = await AuthHelper.RegisterAsync(_client, email);
        AuthHelper.SetBearerToken(_client, token);
        return token;
    }

    [Fact]
    public async Task GetAll_WithoutAuth_Returns401()
    {
        var response = await _client.GetAsync("/api/categories");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_WhenEmpty_Returns200WithEmptyList()
    {
        await AuthenticateAsync();

        var response = await _client.GetAsync("/api/categories");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement[]>(JsonOptions);
        Assert.NotNull(body);
        Assert.Empty(body);
    }

    [Fact]
    public async Task Create_ValidRequest_Returns201WithCategory()
    {
        await AuthenticateAsync();

        var response = await _client.PostAsJsonAsync("/api/categories", new
        {
            Name = "Food",
            Color = "#FF5733",
            Icon = "🍕",
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Equal("Food", body.GetProperty("name").GetString());
        Assert.Equal("#FF5733", body.GetProperty("color").GetString());
        Assert.Equal("🍕", body.GetProperty("icon").GetString());
        Assert.NotEqual(Guid.Empty.ToString(), body.GetProperty("id").GetString());
    }

    [Fact]
    public async Task Create_WithoutAuth_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/categories", new
        {
            Name = "Food",
            Color = "#FF5733",
            Icon = "🍕",
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_MissingName_Returns400()
    {
        await AuthenticateAsync();

        var response = await _client.PostAsJsonAsync("/api/categories", new
        {
            Name = "",
            Color = "#FF5733",
            Icon = "🍕",
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_ReturnsCreatedCategories()
    {
        await AuthenticateAsync();

        await _client.PostAsJsonAsync("/api/categories", new { Name = "Food", Color = "#FF5733", Icon = "🍕" }, JsonOptions);
        await _client.PostAsJsonAsync("/api/categories", new { Name = "Transport", Color = "#3366FF", Icon = "🚗" }, JsonOptions);

        var response = await _client.GetAsync("/api/categories");
        var body = await response.Content.ReadFromJsonAsync<JsonElement[]>(JsonOptions);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(body);
        Assert.Equal(2, body.Length);
    }

    [Fact]
    public async Task Update_ExistingCategory_Returns200WithUpdatedData()
    {
        await AuthenticateAsync();

        var created = await _client.PostAsJsonAsync("/api/categories", new
        {
            Name = "Old Name",
            Color = "#000000",
            Icon = "📁",
        }, JsonOptions);
        var createdBody = await created.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var id = createdBody.GetProperty("id").GetString();

        var response = await _client.PutAsJsonAsync($"/api/categories/{id}", new
        {
            Name = "New Name",
            Color = "#FFFFFF",
            Icon = "✏️",
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Equal("New Name", body.GetProperty("name").GetString());
        Assert.Equal("#FFFFFF", body.GetProperty("color").GetString());
    }

    [Fact]
    public async Task Update_NonExistentCategory_Returns404()
    {
        await AuthenticateAsync();

        var response = await _client.PutAsJsonAsync($"/api/categories/{Guid.NewGuid()}", new
        {
            Name = "Name",
            Color = "#000000",
            Icon = "📁",
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Delete_ExistingCategory_Returns204()
    {
        await AuthenticateAsync();

        var created = await _client.PostAsJsonAsync("/api/categories", new
        {
            Name = "To Delete",
            Color = "#FF0000",
            Icon = "🗑️",
        }, JsonOptions);
        var createdBody = await created.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var id = createdBody.GetProperty("id").GetString();

        var response = await _client.DeleteAsync($"/api/categories/{id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Delete_NonExistentCategory_Returns404()
    {
        await AuthenticateAsync();

        var response = await _client.DeleteAsync($"/api/categories/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Categories_AreUserScoped_UserCannotSeeOtherUserCategories()
    {
        var clientA = factory.CreateClient();
        var (tokenA, _) = await AuthHelper.RegisterAsync(clientA, "user-a@test.com");
        AuthHelper.SetBearerToken(clientA, tokenA);

        await clientA.PostAsJsonAsync("/api/categories", new { Name = "User A Category", Color = "#000000", Icon = "A" }, JsonOptions);

        var clientB = factory.CreateClient();
        var (tokenB, _) = await AuthHelper.RegisterAsync(clientB, "user-b@test.com");
        AuthHelper.SetBearerToken(clientB, tokenB);

        var response = await clientB.GetAsync("/api/categories");
        var body = await response.Content.ReadFromJsonAsync<JsonElement[]>(JsonOptions);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(body);
        Assert.Empty(body);
    }
}
