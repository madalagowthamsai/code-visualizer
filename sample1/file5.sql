SELECT 
    f1.customer_name,
    f1.total_balance,
    f1.credit_score,
    f2.avg_high_value_txn,
    f3.risk_category,
    f4.compliance_status,
    p.portfolio_value,
    i.investment_grade
FROM file1 f1
LEFT JOIN file3 f3 ON f1.customer_id = f3.customer_id
LEFT JOIN file4 f4 ON f1.customer_id = f4.customer_id
INNER JOIN (
    SELECT customer_id, AVG(amount) as avg_high_value_txn 
    FROM file2 
    GROUP BY customer_id
) f2 ON f1.customer_id = f2.customer_id
LEFT JOIN investment_portfolios p ON f1.customer_id = p.customer_id
RIGHT JOIN credit_ratings i ON f1.customer_id = i.customer_id
WHERE f1.total_balance > 25000
AND (f3.risk_category != 'HIGH' OR f3.risk_category IS NULL)
ORDER BY f1.total_balance DESC