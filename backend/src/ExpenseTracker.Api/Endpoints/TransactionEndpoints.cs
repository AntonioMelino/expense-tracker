using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ExpenseTracker.Api.Dtos.Transactions;
using ExpenseTracker.Domain.Entities;
using ExpenseTracker.Domain.Enums;
using ExpenseTracker.Domain.Interfaces;

namespace ExpenseTracker.Api.Endpoints;

public static class TransactionEndpoints
{
    public static IEndpointRouteBuilder MapTransactionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/transactions")
            .WithTags("Transactions")
            .RequireAuthorization();

        group.MapGet("/", GetPaged);
        group.MapGet("/summary", GetSummary);
        group.MapPost("/", Create);
        group.MapPut("/{id:guid}", Update);
        group.MapDelete("/{id:guid}", Delete);

        return app;
    }

    private static async Task<IResult> GetPaged(
        ClaimsPrincipal user,
        ITransactionRepository repo,
        CancellationToken ct,
        int? month = null,
        int? year = null,
        Guid? categoryId = null,
        int? type = null,
        int page = 1,
        int pageSize = 20)
    {
        var userId = GetUserId(user);
        var filters = new TransactionFilters(
            UserId: userId,
            Month: month,
            Year: year,
            CategoryId: categoryId,
            Type: type.HasValue ? (TransactionType)type.Value : null,
            Page: Math.Max(1, page),
            PageSize: Math.Clamp(pageSize, 1, 100));

        var result = await repo.GetPagedAsync(filters, ct);
        return Results.Ok(new
        {
            items = result.Items.Select(ToResponse),
            total = result.Total,
            page = result.Page,
            pageSize = result.PageSize,
        });
    }

    private static async Task<IResult> GetSummary(
        ClaimsPrincipal user,
        ITransactionRepository repo,
        CancellationToken ct,
        int? month = null,
        int? year = null)
    {
        var userId = GetUserId(user);
        var now = DateTime.UtcNow;
        var summary = await repo.GetMonthlySummaryAsync(userId, month ?? now.Month, year ?? now.Year, ct);
        return Results.Ok(new SummaryResponse(summary.TotalIncome, summary.TotalExpenses, summary.Net));
    }

    private static async Task<IResult> Create(
        TransactionRequest request,
        ClaimsPrincipal user,
        ITransactionRepository repo,
        CancellationToken ct)
    {
        var errors = ValidateRequest(request);
        if (errors.Count > 0)
            return Results.ValidationProblem(errors);

        var userId = GetUserId(user);
        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            Amount = request.Amount,
            Description = request.Description.Trim(),
            Date = request.Date,
            Type = (TransactionType)request.Type,
            CategoryId = request.CategoryId,
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
        };

        var created = await repo.CreateAsync(transaction, ct);
        var withCategory = await repo.GetByIdAsync(created.Id, userId, ct);
        return Results.Created($"/api/transactions/{created.Id}", ToResponse(withCategory!));
    }

    private static async Task<IResult> Update(
        Guid id,
        TransactionRequest request,
        ClaimsPrincipal user,
        ITransactionRepository repo,
        CancellationToken ct)
    {
        var errors = ValidateRequest(request);
        if (errors.Count > 0)
            return Results.ValidationProblem(errors);

        var userId = GetUserId(user);
        var existing = await repo.GetByIdAsync(id, userId, ct);
        if (existing is null)
            return Results.NotFound();

        existing.Amount = request.Amount;
        existing.Description = request.Description.Trim();
        existing.Date = request.Date;
        existing.Type = (TransactionType)request.Type;
        existing.CategoryId = request.CategoryId;

        await repo.UpdateAsync(existing, ct);
        var refreshed = await repo.GetByIdAsync(existing.Id, userId, ct);
        return Results.Ok(ToResponse(refreshed!));
    }

    private static async Task<IResult> Delete(
        Guid id,
        ClaimsPrincipal user,
        ITransactionRepository repo,
        CancellationToken ct)
    {
        var userId = GetUserId(user);
        var transaction = await repo.GetByIdAsync(id, userId, ct);
        if (transaction is null)
            return Results.NotFound();

        await repo.DeleteAsync(transaction, ct);
        return Results.NoContent();
    }

    private static TransactionResponse ToResponse(Transaction t) => new(
        t.Id,
        t.Amount,
        t.Description,
        t.Date,
        (int)t.Type,
        t.CategoryId,
        t.Category?.Name ?? string.Empty,
        t.Category?.Color ?? string.Empty,
        t.Category?.Icon ?? string.Empty,
        t.CreatedAt);

    private static string GetUserId(ClaimsPrincipal user) =>
        user.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? throw new UnauthorizedAccessException("User ID not found in token");

    private static Dictionary<string, string[]> ValidateRequest(TransactionRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.Amount <= 0)
            errors["amount"] = ["Amount must be greater than zero"];
        if (string.IsNullOrWhiteSpace(request.Description))
            errors["description"] = ["Description is required"];
        if (request.Type is not (0 or 1))
            errors["type"] = ["Type must be 0 (Income) or 1 (Expense)"];
        if (request.CategoryId == Guid.Empty)
            errors["categoryId"] = ["CategoryId is required"];
        return errors;
    }
}
