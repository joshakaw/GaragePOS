import { Injectable } from '@angular/core';
import { DbService } from '../db/db.service';
import {
  ReceiptItem,
  ReceiptItemParams,
} from '../../../models/receipt-item.model';
import {
  DbTransactionDetail,
  ReservedProductId,
} from '../../../models/db/product';
import { NGXLogger } from 'ngx-logger';

/**
 * Helps with dealing with transactions, including calculations
 * of totals, adding new transaction detail items, etc.
 */
@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  // DbService
  constructor(
    private _dbService: DbService,
    private logger: NGXLogger,
  ) {}

  /**
   * Rebuild a previous transaction for reviewing
   * @param transactionId ID of Transaction
   */
  rebuildReceiptItems(transactionId: number): Array<ReceiptItem> {
    const items = [];

    const products: Array<DbTransactionDetail> =
      this._dbService.getTransactionDetailItems(transactionId);

    for (const product of products) {
      if (product.Quantity == 0) {
        continue;
      }
      const params: ReceiptItemParams = {
        productId: product.ProductID,
        productTitle: product.ProductTitle,
        unitPrice: product.UnitPrice,
        quantity: product.Quantity,
      };

      items.push(new ReceiptItem(params));
    }

    return items;
  }

  /**
   * Creates a new ReceiptItem
   * @param productId ID of Product
   * @param quantity Quantity of product.
   * @param price Custom price of product.
   * @returns ReceiptItem
   */
  createReceiptItem(
    productId: number,
    quantity?: number,
    price?: number,
  ): ReceiptItem {
    const prod = this._dbService.getProduct(productId);

    if (!prod) {
      this.logger.warn(
        `Receipt item was created from undefined product ID ${productId}. ` +
          `Blank receipt item created.`,
      );
      // TODO: Create a product not found factory class or something?
      const params: ReceiptItemParams = {
        productId: ReservedProductId.ProductNotFound,
        productTitle: '',
        unitPrice: 0,
        quantity: 0,
      };
      return new ReceiptItem(params);
    }

    return new ReceiptItem({
      productId: productId,
      productTitle: prod.Title,
      quantity: quantity ?? 1,
      unitPrice: price ?? prod.Price,
    });
  }

  /**
   * Returns true if a product ID shouldn't be included in total.
   */
  isProductForAccountingOnly(product: ReceiptItem) {
    const accountingProductIds = [
      ReservedProductId.CashPayment,
      ReservedProductId.CashPaymentChange,
    ];
    return accountingProductIds.includes(product.productId);
  }

  /**
   * Calculate the subtotal before tax for a list of receipt items.
   * @param items Receipt items
   * @returns Subtotal
   */
  subtotal(items: Array<ReceiptItem>): number {
    const totalUnfixed = items
      .map((val) => {
        if (this.isProductForAccountingOnly(val)) {
          return 0;
        }
        return val.total;
      })
      .reduce((sum, next) => {
        return sum + next;
      }, 0);

    // Rounding to the nearest cent $X.XX for subtotal
    // Multipling causes some error, so don't use math.ceil
    const totalCentFixed = Math.round(totalUnfixed * 100) / 100;

    return totalCentFixed;
  }

  total(items: Array<ReceiptItem>): number {
    return this.subtotal(items); 
  }

  totalDue(items: Array<ReceiptItem>): number {
    const total = items
      .map((item) => item.total)
      .reduce((sum, next) => {
        return sum + next;
      }, 0);

    const totalFixed = Math.round(total * 100) / 100;

    return totalFixed;
  }

  // Database should contain raw numbers that were used in calculated
  // E.g. 3.999/gal in gas, we don't want to round the unit price to 3.99.
  // The rounding is only for display. But also important for final cash payments
  // and displaying correct change.

  // Each transaction should have a roundingTechnique?

  // /**
  //  * Rounds a dollar amount
  //  * @param amount Amount of money
  //  * @returns Amount, rounded to hundredth
  //  */
  // roundToCent(amount: number): number {
  //   return Math.round(amount * 100) / 100
  // }
}
