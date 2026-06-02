using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ExpenseTracker.Api.Dtos.Categories;
using ExpenseTracker.Domain.Entities;
using ExpenseTracker.Domain.Interfaces;

namespace ExpenseTracker.Api.Endpoints;

public static class CategoryEndpoints
{
    public static IEndpointRouteBuilder MapCategoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/categories")
            .WithTags("Categories")
            .RequireAuthorization();

        group.MapGet("/", GetAll);
        group.MapPost("/", Create);
        group.MapPut("/{id:guid}", Update);
        group.MapDelete("/{id:guid}", Delete);

        return app;
    }

    private static async Task<IResult> GetAll(
        ClaimsPrincipal user,
        ICategoryRepository repo,
        CancellationToken ct)
    {
        var userId = GetUserId(user);
        var categories = await repo.GetAllByUserAsync(userId, ct);
        return Results.Ok(categories.Select(ToResponse));
    }

    private static async Task<IResult> Create(
        CategoryRequest request,
        ClaimsPrincipal user,
        ICategoryRepository repo,
        CancellationToken ct)
    {
        var errors = ValidateRequest(request);
        if (errors.Count > 0)
            return Results.ValidationProblem(errors);

        var userId = GetUserId(user);
        var category = new Category
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Color = request.Color,
            Icon = request.Icon,
            UserId = userId,
        };

        var created = await repo.CreateAsync(category, ct);
        return Results.Created($"/api/categories/{created.Id}", ToResponse(created));
    }

    private static async Task<IResult> Update(
        Guid id,
        CategoryRequest request,
        ClaimsPrincipal user,
        ICategoryRepository repo,
        CancellationToken ct)
    {
        var errors = ValidateRequest(request);
        if (errors.Count > 0)
            return Results.ValidationProblem(errors);

        var userId = GetUserId(user);
        var existing = await repo.GetByIdAsync(id, userId, ct);
        if (existing is null)
            return Results.NotFound();

        existing.Name = request.Name.Trim();
        existing.Color = request.Color;
        existing.Icon = request.Icon;

        var updated = await repo.UpdateAsync(existing, ct);
        return Results.Ok(ToResponse(updated));
    }

    private static async Task<IResult> Delete(
        Guid id,
        ClaimsPrincipal user,
        ICategoryRepository repo,
        CancellationToken ct)
    {
        var userId = GetUserId(user);
        var category = await repo.GetByIdAsync(id, userId, ct);
        if (category is null)
            return Results.NotFound();

        await repo.DeleteAsync(category, ct);
        return Results.NoContent();
    }

    private static CategoryResponse ToResponse(Category c) =>
        new(c.Id, c.Name, c.Color, c.Icon);

    private static string GetUserId(ClaimsPrincipal user) =>
        user.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? throw new UnauthorizedAccessException("User ID not found in token");

    private static Dictionary<string, string[]> ValidateRequest(CategoryRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(request.Name))
            errors["name"] = ["Name is required"];
        if (string.IsNullOrWhiteSpace(request.Color))
            errors["color"] = ["Color is required"];
        if (string.IsNullOrWhiteSpace(request.Icon))
            errors["icon"] = ["Icon is required"];
        return errors;
    }
}
