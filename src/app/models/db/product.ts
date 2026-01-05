export type DbProduct = {
  ProductID: number;
  Title: string;
  Price: number;
  ProductGroupID: number,
  CreatedAt: string;
};

export type DbProductGroup = {
  ProductGroupID: number,
  Title: string,
  CreatedAt: string
}

export type DbGridMenuButton = {
  GridMenuButtonID: number;
  GridMenuID: number | null;
  ImageID: number | null;
  Label: string | null;
  X: number;
  Y: number;
  W: number;
  H: number;
  OnClick_Script: string | null;
  OnClick_OpenGridMenuID: number | null;
  OnClick_AddProductID: number | null;
};

// Incomplete
export type DbTransaction = {
  TransactionID: number;
  ClerkID: number;
  // "Type"	INT NOT NULL DEFAULT 'Transaction' CHECK("Type" IN ('Transaction', 'Pay In', 'Pay Out')),
  IsVoided: boolean;
  TimeStarted: string;
  TimeEnded: string;
};

export type DbTransactionDetail = {
  TransactionDetailID?: number;
  TransactionID: number;
  ProductID: number; // IDs 0-100 are reserved for system products (e.g. pay in, pay out)
  ProductTitle: string;
  Quantity: number;
  UnitPrice: number;
  /** Does not track system price overrides (e.g. multiply by -1 for refund) */
  IsUnitPriceOverridden: boolean;
};

/**
 * Data Transfer Object for TransactionDetail.
 */
export type LocalTransactionDetail = {
  ProductID: number; // IDs 0-100 are reserved for system products (e.g. pay in, pay out)
  Quantity: number;
  UnitPrice: number;
  IsUnitPriceOverridden: boolean;
};

export enum ReservedGridMenuButtonLabel {
  Invisible = '<BLANK>',
}

/** Reserved ids [0-100] */
export enum ReservedProductId {
  /**
   * Indicates that the associated product with
   * this line item does not exist.
   */
  ProductNotFound = 10,

  /**
   * Payment made with cash.
   */
  CashPayment = 20,

  /**
   * Change owed to customer after
   * higher amount tendered than total
   */
  CashPaymentChange = 21,
  /**
   * Pay in to the register
   * (e.g. cash added to register)
   *
   * AKA Recieved on Account
   */
  PayIn = 40,
  /**
   * Pay out of the register
   * (e.g. cash removed from register)
   */
  PayOut = 45,
}
