import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DbService } from '../../core/services/db/db.service';
import { PosService } from '../../core/services/pos/pos.service';

@Component({
  selector: 'app-report-page',
  imports: [CommonModule],
  templateUrl: './report-page.component.html',
  styleUrl: './report-page.component.scss',
})
export class ReportPageComponent {
  protected sqlReports: Array<{
    title: string;
    small?: string;
    description?: string;
    sql: string;
  }> = [
    {
      title: 'Daily Sales Summary',
      small: 'Last Month',
      sql: `SELECT 
    DATE(t.TimeEnded) as SaleDate,
    COUNT(DISTINCT t.TransactionID) as TotalTransactions,
    SUM(td.Quantity * td.UnitPrice) as GrossSales,
    SUM(CASE WHEN t.IsVoided = 1 THEN td.Quantity * td.UnitPrice ELSE 0 END) as VoidedSales,
    SUM(CASE WHEN t.IsVoided = 0 THEN td.Quantity * td.UnitPrice ELSE 0 END) as NetSales,
    SUM(CASE WHEN t.IsVoided = 0 THEN td.Quantity ELSE 0 END) as ItemsSold
FROM \`Transaction\` t
JOIN TransactionDetail td ON t.TransactionID = td.TransactionID
WHERE DATE(t.TimeEnded) >= DATE('now', '-1 month')
    AND t.TimeEnded IS NOT NULL
GROUP BY DATE(t.TimeEnded)
ORDER BY DATE(t.TimeEnded) DESC;`,
    },
    {
      title: 'Top Selling Products',
      small: 'Today',
      sql: `SELECT 
    p.ProductID,
    p.Title as ProductName,
    SUM(td.Quantity) as QuantitySold,
    SUM(td.Quantity * td.UnitPrice) as TotalRevenue,
    COUNT(DISTINCT td.TransactionID) as TimesOrdered,
    ROUND(AVG(td.UnitPrice), 2) as AvgPrice
FROM Product p
JOIN TransactionDetail td ON p.ProductID = td.ProductID
JOIN \`Transaction\` t ON td.TransactionID = t.TransactionID
WHERE DATE(t.TimeEnded) = DATE('now')
    AND t.IsVoided = 0
    AND t.TimeEnded IS NOT NULL
GROUP BY p.ProductID, p.Title
ORDER BY TotalRevenue DESC
LIMIT 20;`,
    },
    {
      title: 'Cash In Drawer',
      // Uncomment once PayIn/PayOut is implemented
      // description: 'Note: If amount after count is incorrect, correct with a Pay In / Pay Out.',
      sql: `SELECT 
    SUM(CASE 
        WHEN td.ProductID = 40 THEN td.Quantity * td.UnitPrice  -- Pay In
        WHEN td.ProductID = 45 THEN td.Quantity * td.UnitPrice * -1  -- Pay Out (negative)
        WHEN td.ProductID = 20 THEN td.Quantity * td.UnitPrice  -- Cash Payment
        WHEN td.ProductID = 21 THEN td.Quantity * td.UnitPrice * -1  -- Cash Change (negative)
        ELSE 0 
    END) * -1 as CurrentCashBalance
FROM TransactionDetail td
JOIN \`Transaction\` t ON td.TransactionID = t.TransactionID
WHERE t.IsVoided = 0
    AND t.TimeEnded IS NOT NULL;`,
    },
  ];

  constructor(
    private _dbService: DbService,
    private _posService: PosService,
  ) {}

  onClick(item: {
    title: string;
    small?: string;
    description?: string;
    sql: string;
  }) {
    this._posService.triggerPrompt({
      type: 'table',
      title: item.title,
      description: item.description ?? item.small ?? '',
      options: ['Close'],
      inputParams: this._dbService.execSql(item.sql),
      onOptionClick: function (option: string, data: any): void {
        //throw new Error('Function not implemented.');
      },
      dismissable: false,
    });
  }
}
