using ExpenseTracker.Domain.Entities;
using ExpenseTracker.Domain.Interfaces;
using ExpenseTracker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Infrastructure.Repositories;

public class CategoryRepository(AppDbContext db) : ICategoryRepository
{
    public async Task<IReadOnlyList<Category>> GetAllByUserAsync(string userId, CancellationToken ct = default)
    {
        return await db.Categories
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.Name)
            .ToListAsync(ct);
    }

    public async Task<Category?> GetByIdAsync(Guid id, string userId, CancellationToken ct = default)
    {
        return await db.Categories
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId, ct);
    }

    public async Task<Category> CreateAsync(Category category, CancellationToken ct = default)
    {
        db.Categories.Add(category);
        await db.SaveChangesAsync(ct);
        return category;
    }

    public async Task<Category> UpdateAsync(Category category, CancellationToken ct = default)
    {
        db.Categories.Update(category);
        await db.SaveChangesAsync(ct);
        return category;
    }

    public async Task DeleteAsync(Category category, CancellationToken ct = default)
    {
        db.Categories.Remove(category);
        await db.SaveChangesAsync(ct);
    }
}
