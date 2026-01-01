import { Injectable } from '@angular/core';
import { DbService } from '../db/db.service';
import { ReceiptItem, ReceiptItemParams } from '../../../models/receipt-item.model';
import { ReservedProductId } from '../../../models/db/product';
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
  constructor(private _dbService: DbService, private logger : NGXLogger) {}

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
    price?: number
  ): ReceiptItem {
    let prod = this._dbService.getProduct(productId);

    if(!prod){
      this.logger.warn(`Receipt item was created from undefined product ID ${productId}. `
        + `Blank receipt item created.`
      )
      // TODO: Create a product not found factory class or something?
      let params : ReceiptItemParams = {
        productId: ReservedProductId.ProductNotFound,
        productTitle: '',
        unitPrice: 0,
        quantity: 0
      }
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
    let accountingProductIds = [
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
    let totalUnfixed = items
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
    let totalCentFixed = Math.round(totalUnfixed * 100) / 100;

    return totalCentFixed;
  }

  taxTotal(items: Array<ReceiptItem>): number {
    console.warn('Tax total NOT implemented');
    return 0;
  }

  total(items: Array<ReceiptItem>): number {
    return this.subtotal(items) + this.taxTotal(items);
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
