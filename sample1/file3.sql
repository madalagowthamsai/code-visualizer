SELECT 
    f1.customer_name,
    f1.total_balance,
    f1.credit_score,
    COUNT(f2.transaction_id) as high_value_txn_count,
    AVG(f2.amount) as avg_high_value_txn,
    r.risk_score,
    r.risk_category,
    la.loan_amount,
    la.interest_rate
FROM file1 f1
LEFT JOIN file2 f2 ON f1.customer_id = f2.customer_id
INNER JOIN risk_assessments r ON f1.customer_id = r.customer_id
LEFT JOIN loan_applications la ON f1.customer_id = la.customer_id
WHERE f1.total_balance > 50000
OR (f2.amount > 5000 AND f1.credit_score < 700)