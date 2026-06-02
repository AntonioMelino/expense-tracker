using ExpenseTracker.Domain.Entities;
using ExpenseTracker.Domain.Enums;
using ExpenseTracker.Domain.Interfaces;
using ExpenseTracker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Infrastructure.Repositories;

public class TransactionRepository(AppDbContext db) : ITransactionRepository
{
    public async Task<PagedResult<Transaction>> GetPagedAsync(TransactionFilters filters, CancellationToken ct = default)
    {
        var query = db.Transactions
            .Include(t => t.Category)
            .Where(t => t.UserId == filters.UserId);

        if (filters.Month.HasValue && filters.Year.HasValue)
            query = query.Where(t => t.Date.Month == filters.Month.Value && t.Date.Year == filters.Year.Value);

        if (filters.CategoryId.HasValue)
            query = query.Where(t => t.CategoryId == filters.CategoryId.Value);

        if (filters.Type.HasValue)
            query = query.Where(t => t.Type == filters.Type.Value);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .Skip((filters.Page - 1) * filters.PageSize)
            .Take(filters.PageSize)
            .ToListAsync(ct);

        return new PagedResult<Transaction>(items, total, filters.Page, filters.PageSize);
    }

    public async Task<Transaction?> GetByIdAsync(Guid id, string userId, CancellationToken ct = default)
    {
        return await db.Transactions
            .Include(t => t.Category)
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, ct);
    }

    public async Task<Transaction> CreateAsync(Transaction transaction, CancellationToken ct = default)
    {
        db.Transactions.Add(transaction);
        await db.SaveChangesAsync(ct);
        return transaction;
    }

    public async Task<Transaction> UpdateAsync(Transaction transaction, CancellationToken ct = default)
    {
        db.Transactions.Update(transaction);
        await db.SaveChangesAsync(ct);
        return transaction;
    }

    public async Task DeleteAsync(Transaction transaction, CancellationToken ct = default)
    {
        db.Transactions.Remove(transaction);
        await db.SaveChangesAsync(ct);
    }

    public async Task<MonthlySummary> GetMonthlySummaryAsync(string userId, int month, int year, CancellationToken ct = default)
    {
        var transactions = await db.Transactions
            .Where(t => t.UserId == userId && t.Date.Month == month && t.Date.Year == year)
            .ToListAsync(ct);

        var totalIncome = transactions
            .Where(t => t.Type == TransactionType.Income)
            .Sum(t => t.Amount);

        var totalExpenses = transactions
            .Where(t => t.Type == TransactionType.Expense)
            .Sum(t => t.Amount);

        return new MonthlySummary(totalIncome, totalExpenses, totalIncome - totalExpenses);
    }
}
