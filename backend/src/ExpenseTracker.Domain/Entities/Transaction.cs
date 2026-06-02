using ExpenseTracker.Domain.Enums;

namespace ExpenseTracker.Domain.Entities;

public class Transaction
{
    public Guid Id { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public TransactionType Type { get; set; }
    public Guid CategoryId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public Category Category { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
}
