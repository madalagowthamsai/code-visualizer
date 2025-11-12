SELECT 
    c.customer_id,
    c.customer_name,
    c.credit_score,
    SUM(a.current_balance) as total_balance,
    COUNT(a.account_id) as account_count
FROM customers c
LEFT JOIN accounts a ON c.customer_id = a.customer_id
WHERE c.status = 'ACTIVE'
GROUP BY c.customer_id, c.customer_name, c.credit_score
HAVING SUM(a.current_balance) > 5000