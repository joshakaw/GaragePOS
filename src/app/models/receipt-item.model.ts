import { DbService } from '../core/services/db/db.service';
import { ReservedProductId } from './db/product';

export interface ReceiptItemParams {
  productId: number;
  productTitle: string;
  unitPrice: number;
  quantity: number;
  isPriceOverriden?: boolean;
}

/**
 * Represents a line item in a transaction
 * for display on a receipt.
 */
export class ReceiptItem {
  private _name: string;
  private _productId: number;
  private _quantity: number;

  private originalUnitPrice: number;
  private _unitPrice: number;
  private _isPriceOverriden: boolean;

  constructor(params: ReceiptItemParams) {

    this._productId = params.productId ?? ReservedProductId.ProductNotFound;
    this._name = params.productTitle;
    this._quantity = this.quantityToInteger(params.quantity);

    this._unitPrice = params.unitPrice;
    this.originalUnitPrice = this._unitPrice;

    this._isPriceOverriden = params.isPriceOverriden ?? false;
  }

  quantityToInteger(quantity: number) : number {
    return Math.floor(quantity);
  }

  get total(): number {
    return Number((this.quantity * this.unitPrice).toFixed(2));
  }

  get displayTotal(): string {
    return '$' + this.total.toFixed(2);
  }

  public get name(): string {
    return this._name;
  }
  public set name(value: string) {
    this._name = value;
  }

  public get quantity(): number {
    return this._quantity;
  }

  /** 
   * Sets quantity, flooring it to the nearest integer.
   * 
   * Remark: A zero-quantity item will still be saved to DB
   * and will be recognized as a voided transaction detail.
   * */
  public set quantity(value: number) {
    this._quantity = this.quantityToInteger(value);
  }

  public get unitPrice(): number {
    return this._unitPrice;
  }
  public set unitPrice(value: number) {
    // Track if this overrides the original price
    if (value != this.originalUnitPrice) {
      this._isPriceOverriden = true;
    }

    this._unitPrice = value;
  }

  public get productId() : number {
    return this._productId;
  }

  public get isPriceOverriden() : boolean {
    return this._isPriceOverriden;
  }

  public get json() {
    return {
      productId: this.productId,
      productTitle: this.name,
      quantity: this.quantity,
      unitPrice: this.unitPrice,
      isPriceOverriden: this.isPriceOverriden,
    }
  }
}
