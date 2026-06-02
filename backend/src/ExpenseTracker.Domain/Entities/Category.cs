namespace ExpenseTracker.Domain.Entities;

public class Category
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#6366F1";
    public string Icon { get; set; } = "📁";
    public string UserId { get; set; } = string.Empty;

    public ApplicationUser User { get; set; } = null!;
    public ICollection<Transaction> Transactions { get; set; } = [];
}
