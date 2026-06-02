namespace ExpenseTracker.Api.Dtos.Transactions;

public record TransactionRequest(
    decimal Amount,
    string Description,
    DateOnly Date,
    int Type,
    Guid CategoryId);

public record TransactionResponse(
    Guid Id,
    decimal Amount,
    string Description,
    DateOnly Date,
    int Type,
    Guid CategoryId,
    string CategoryName,
    string CategoryColor,
    string CategoryIcon,
    DateTime CreatedAt);

public record SummaryResponse(decimal TotalIncome, decimal TotalExpenses, decimal Net);
