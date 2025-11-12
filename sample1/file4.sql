SELECT 
    f3.customer_name,
    f3.total_balance,
    f3.risk_category,
    f2.transaction_type,
    f2.amount as transaction_amount,
    f2.branch_name,
    c.compliance_status,
    a.alert_type,
    k.kyc_review_date
FROM file3 f3
INNER JOIN file2 f2 ON f3.customer_id = f2.customer_id
LEFT JOIN compliance_checks c ON f3.customer_id = c.customer_id
LEFT JOIN alert_logs a ON f2.transaction_id = a.transaction_id
WHERE f3.risk_category IN ('HIGH', 'MEDIUM')
OR f2.amount > 10000
OR c.compliance_status = 'PENDING_REVIEW'