using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ExpenseTracker.Tests.Fixtures;
using ExpenseTracker.Tests.Helpers;

namespace ExpenseTracker.Tests.Tests;

[Collection("Database")]
public class TransactionEndpointsTests(TestWebApplicationFactory factory) : IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly HttpClient _client = factory.CreateClient();

    public async Task InitializeAsync() => await factory.ResetDataAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<(string Token, string CategoryId)> SetupAsync(string email = "tx@test.com")
    {
        var (token, _) = await AuthHelper.RegisterAsync(_client, email);
        AuthHelper.SetBearerToken(_client, token);

        var catResponse = await _client.PostAsJsonAsync("/api/categories", new
        {
            Name = "Food",
            Color = "#FF5733",
            Icon = "🍕",
        }, JsonOptions);
        var catBody = await catResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var categoryId = catBody.GetProperty("id").GetString()!;

        return (token, categoryId);
    }

    [Fact]
    public async Task GetPaged_WithoutAuth_Returns401()
    {
        var response = await _client.GetAsync("/api/transactions");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetPaged_WhenEmpty_Returns200WithEmptyList()
    {
        await SetupAsync();

        var response = await _client.GetAsync("/api/transactions");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Equal(0, body.GetProperty("total").GetInt32());
        Assert.Equal(0, body.GetProperty("items").GetArrayLength());
    }

    [Fact]
    public async Task Create_ValidIncomeTransaction_Returns201()
    {
        var (_, categoryId) = await SetupAsync();

        var response = await _client.PostAsJsonAsync("/api/transactions", new
        {
            Amount = 1500.00m,
            Description = "Salary",
            Date = "2026-06-01",
            Type = 0,
            CategoryId = categoryId,
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Equal(1500.00m, body.GetProperty("amount").GetDecimal());
        Assert.Equal("Salary", body.GetProperty("description").GetString());
        Assert.Equal(0, body.GetProperty("type").GetInt32());
        Assert.Equal("Food", body.GetProperty("categoryName").GetString());
    }

    [Fact]
    public async Task Create_WithoutAuth_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/transactions", new
        {
            Amount = 100m,
            Description = "Test",
            Date = "2026-06-01",
            Type = 1,
            CategoryId = Guid.NewGuid().ToString(),
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_NegativeAmount_Returns400()
    {
        var (_, categoryId) = await SetupAsync();

        var response = await _client.PostAsJsonAsync("/api/transactions", new
        {
            Amount = -50m,
            Description = "Bad amount",
            Date = "2026-06-01",
            Type = 1,
            CategoryId = categoryId,
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_MissingDescription_Returns400()
    {
        var (_, categoryId) = await SetupAsync();

        var response = await _client.PostAsJsonAsync("/api/transactions", new
        {
            Amount = 100m,
            Description = "",
            Date = "2026-06-01",
            Type = 1,
            CategoryId = categoryId,
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetPaged_ReturnsPaginatedResults()
    {
        var (_, categoryId) = await SetupAsync();

        for (var i = 1; i <= 5; i++)
        {
            await _client.PostAsJsonAsync("/api/transactions", new
            {
                Amount = (decimal)(i * 10),
                Description = $"Tx {i}",
                Date = $"2026-06-{i:D2}",
                Type = 1,
                CategoryId = categoryId,
            }, JsonOptions);
        }

        var response = await _client.GetAsync("/api/transactions?page=1&pageSize=3");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Equal(5, body.GetProperty("total").GetInt32());
        Assert.Equal(3, body.GetProperty("items").GetArrayLength());
        Assert.Equal(1, body.GetProperty("page").GetInt32());
    }

    [Fact]
    public async Task GetSummary_ReturnsCorrectTotals()
    {
        var (_, categoryId) = await SetupAsync();

        await _client.PostAsJsonAsync("/api/transactions", new
        {
            Amount = 3000m,
            Description = "Income",
            Date = "2026-06-01",
            Type = 0,
            CategoryId = categoryId,
        }, JsonOptions);

        await _client.PostAsJsonAsync("/api/transactions", new
        {
            Amount = 500m,
            Description = "Expense",
            Date = "2026-06-01",
            Type = 1,
            CategoryId = categoryId,
        }, JsonOptions);

        var response = await _client.GetAsync("/api/transactions/summary?month=6&year=2026");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Equal(3000m, body.GetProperty("totalIncome").GetDecimal());
        Assert.Equal(500m, body.GetProperty("totalExpenses").GetDecimal());
        Assert.Equal(2500m, body.GetProperty("net").GetDecimal());
    }

    [Fact]
    public async Task Update_ExistingTransaction_Returns200()
    {
        var (_, categoryId) = await SetupAsync();

        var created = await _client.PostAsJsonAsync("/api/transactions", new
        {
            Amount = 100m,
            Description = "Original",
            Date = "2026-06-01",
            Type = 1,
            CategoryId = categoryId,
        }, JsonOptions);
        var createdBody = await created.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var id = createdBody.GetProperty("id").GetString();

        var response = await _client.PutAsJsonAsync($"/api/transactions/{id}", new
        {
            Amount = 200m,
            Description = "Updated",
            Date = "2026-06-15",
            Type = 0,
            CategoryId = categoryId,
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Equal(200m, body.GetProperty("amount").GetDecimal());
        Assert.Equal("Updated", body.GetProperty("description").GetString());
        Assert.Equal(0, body.GetProperty("type").GetInt32());
    }

    [Fact]
    public async Task Update_NonExistentTransaction_Returns404()
    {
        var (_, categoryId) = await SetupAsync();

        var response = await _client.PutAsJsonAsync($"/api/transactions/{Guid.NewGuid()}", new
        {
            Amount = 100m,
            Description = "Test",
            Date = "2026-06-01",
            Type = 1,
            CategoryId = categoryId,
        }, JsonOptions);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Delete_ExistingTransaction_Returns204()
    {
        var (_, categoryId) = await SetupAsync();

        var created = await _client.PostAsJsonAsync("/api/transactions", new
        {
            Amount = 100m,
            Description = "To Delete",
            Date = "2026-06-01",
            Type = 1,
            CategoryId = categoryId,
        }, JsonOptions);
        var createdBody = await created.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var id = createdBody.GetProperty("id").GetString();

        var response = await _client.DeleteAsync($"/api/transactions/{id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Delete_NonExistentTransaction_Returns404()
    {
        await SetupAsync();

        var response = await _client.DeleteAsync($"/api/transactions/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Transactions_AreUserScoped_UserCannotSeeOtherUserTransactions()
    {
        var clientA = factory.CreateClient();
        var (tokenA, _) = await AuthHelper.RegisterAsync(clientA, "tx-user-a@test.com");
        AuthHelper.SetBearerToken(clientA, tokenA);

        var catA = await clientA.PostAsJsonAsync("/api/categories", new { Name = "Cat A", Color = "#000", Icon = "A" }, JsonOptions);
        var catABody = await catA.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var catAId = catABody.GetProperty("id").GetString();

        await clientA.PostAsJsonAsync("/api/transactions", new
        {
            Amount = 100m,
            Description = "User A tx",
            Date = "2026-06-01",
            Type = 1,
            CategoryId = catAId,
        }, JsonOptions);

        var clientB = factory.CreateClient();
        var (tokenB, _) = await AuthHelper.RegisterAsync(clientB, "tx-user-b@test.com");
        AuthHelper.SetBearerToken(clientB, tokenB);

        var response = await clientB.GetAsync("/api/transactions");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(0, body.GetProperty("total").GetInt32());
    }
}
