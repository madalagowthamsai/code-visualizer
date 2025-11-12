SELECT 
    file1.customer_name,
    file1.total_balance,
    file1.credit_score,
    t.transaction_id,
    t.amount,
    t.transaction_date,
    t.transaction_type,
    b.branch_name
FROM file1
INNER JOIN transactions t ON file1.customer_id = t.customer_id
LEFT JOIN branches b ON t.branch_id = b.branch_id
WHERE t.amount > 1000
AND file1.total_balance > 10000
AND file1.credit_score >= 750