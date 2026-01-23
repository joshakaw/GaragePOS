export enum SqlQueries {
  CashInPossession = `SELECT 
    ROUND(SUM(CASE 
        WHEN td.ProductID = 40 THEN td.Quantity * td.UnitPrice  -- Pay In
        WHEN td.ProductID = 45 THEN td.Quantity * td.UnitPrice  -- Pay Out (negative)
        WHEN td.ProductID = 50 THEN td.Quantity * td.UnitPrice  -- Cashbox Adjustment (pos or neg)
        WHEN td.ProductID = 20 THEN td.Quantity * td.UnitPrice  -- Cash Payment
        WHEN td.ProductID = 21 THEN td.Quantity * td.UnitPrice  -- Cash Change (negative)
        ELSE 0 
    END) * -1, 2) as CurrentCashBalance
    FROM TransactionDetail td
    JOIN \`Transaction\` t ON td.TransactionID = t.TransactionID
    WHERE t.IsVoided = 0
    AND t.TimeEnded IS NOT NULL;`,
}
