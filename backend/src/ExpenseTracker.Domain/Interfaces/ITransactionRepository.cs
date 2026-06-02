using ExpenseTracker.Domain.Entities;
using ExpenseTracker.Domain.Enums;

namespace ExpenseTracker.Domain.Interfaces;

public record TransactionFilters(
    string UserId,
    int? Month,
    int? Year,
    Guid? CategoryId,
    TransactionType? Type,
    int Page,
    int PageSize
);

public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

public record MonthlySummary(decimal TotalIncome, decimal TotalExpenses, decimal Net);

public interface ITransactionRepository
{
    Task<PagedResult<Transaction>> GetPagedAsync(TransactionFilters filters, CancellationToken ct = default);
    Task<Transaction?> GetByIdAsync(Guid id, string userId, CancellationToken ct = default);
    Task<Transaction> CreateAsync(Transaction transaction, CancellationToken ct = default);
    Task<Transaction> UpdateAsync(Transaction transaction, CancellationToken ct = default);
    Task DeleteAsync(Transaction transaction, CancellationToken ct = default);
    Task<MonthlySummary> GetMonthlySummaryAsync(string userId, int month, int year, CancellationToken ct = default);
}
