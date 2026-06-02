namespace ExpenseTracker.Api.Dtos.Categories;

public record CategoryRequest(string Name, string Color, string Icon);

public record CategoryResponse(Guid Id, string Name, string Color, string Icon);
