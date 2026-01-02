import { Injectable } from '@angular/core';
import { Database } from 'better-sqlite3';
import { DB_SCHEMA } from './schema';
import { ReceiptItem } from '../../../models/receipt-item.model';
import {
  DbGridMenuButton,
  DbProduct,
  ReservedProductId,
} from '../../../models/db/product';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root',
})
export class DbService {
  db: Database;

  constructor(private logger: NGXLogger) {
    console.log(window.require);
    if (typeof window.require == 'undefined') {
      throw new Error(
        'DbService cannot be ran on a web browser. ' +
          'The better-sqlite3 package is needed from the ' +
          "Electron main process, which doesn't run on browser."
      );
    }

    const DB = window.require('better-sqlite3');
    this.db = new DB('./app/UserData.db');
    this.db.pragma('journal_mode = WAL');

    this.initialSeeding();
  }

  /**
   * When POS is first created, this sets
   * up the database with initial tables and
   * data.
   */
  initialSeeding() {
    // Create tables
    this.db.exec(DB_SCHEMA);
    // Add default clerk
    this.db
      .prepare(
        "INSERT OR IGNORE INTO Clerk (ClerkID, FirstName, LastName) VALUES (1, 'Admin', 'User')"
      )
      .run();

    // Add main menu ID=1
    this.db
      .prepare('INSERT OR IGNORE INTO GridMenu (GridMenuID) VALUES (1)')
      .run();
    // Reserve system products (e.g. Pay In, Pay Out, Change)

    let systemProducts = [
      { id: 10, title: 'Change' },
      { id: 30, title: 'Pay In' },
      { id: 35, title: 'Pay Out' },
    ];

    let insert = this.db.prepare(
      'INSERT OR IGNORE INTO Product (ProductID, Title, Price) VALUES (?, ?, ?)'
    );

    let insertProducts = this.db.transaction(() => {
      for (let i = 0; i < 100; i++) {
        let name = systemProducts.find((p) => p.id === i) ?? {
          id: i,
          title: 'SYS PROD ' + i,
        };
        insert.run(name.id, name.title, 0);
      }
    });

    insertProducts();
  }

  getGridItems(id: number): Array<DbGridMenuButton> {
    console.log('Ran get Grid Layout');

    var items = this.db
      .prepare('SELECT * FROM GridMenuButton b WHERE b.GridMenuID = ?')
      .all(id) as Array<DbGridMenuButton>;
    console.log(items);

    return items;
  }

  /**
   * @returns Created GridMenuID
   */
  createGridMenu(parentGridMenuId: number): number {
    let result = this.db
      .prepare(
        `
      INSERT INTO GridMenu (ParentGridMenuID) VALUES (@ParentGridMenuID);
      `
      )
      .run({ParentGridMenuID: parentGridMenuId});

    return result.lastInsertRowid as number;
  }

  /**
   * Create a GridMenuButton on the database, unless the new
   * obj conflicts with an existing one.
   *
   * -1 values signal a replace
   *
   * @param obj Object to create. `GridMenuButtonID` has no effect.
   * @returns Id of created GridMenuButton
   * @throws Grid menu conflict
   *
   */
  createGridMenuButton(obj: DbGridMenuButton): number {
    // Ensure that one does not conflict
    let conflict = this.db
      .prepare(
        `
      SELECT GridMenuButtonID as id FROM GridMenuButton
      WHERE GridMenuID = @GridMenuID
        AND NOT (
          (X + W - 1) < @X           -- existing right < new left
          OR X > (@X + @W - 1)       -- existing left > new right
          OR (Y + H - 1) < @Y        -- existing bottom < new top
          OR Y > (@Y + @H - 1)       -- existing top > new bottom
        )
      `
      )
      .get(obj) as { id: number };

    if (conflict) {
      throw new Error(
        'Cannot create grid item - conflicts with GridMenuItemID ' + conflict.id
      );
    }

    // Create the item.

    let result = this.db
      .prepare(
        `
      INSERT INTO GridMenuButton
      (GridMenuID, ImageID, Label, X, Y, W, H, OnClick_Script, OnClick_OpenGridMenuID, OnClick_AddProductID)
      VALUES(@GridMenuID, @ImageID, @Label, @X, @Y, @W, @H, @OnClick_Script, @OnClick_OpenGridMenuID, @OnClick_AddProductID);
      `
      )
      .run(obj);

      this.logger.info("Created new GridMenuButton")

    return result.lastInsertRowid as number;
  }

  updateGridMenuButton(
    id: number,
    obj: {
      label: string;
      productId: number;
      defaultQuantity: number;
    }
  ) {
    // TODO: Implement default quantity - add column to database
    this.logger.warn(
      'Warning: Default quantity not implemented for GridMenuButtons'
    );

    let result = this.db
      .prepare(
        `UPDATE "GridMenuButton"
        SET Label = ?,
        OnClick_AddProductID = ?
        WHERE "GridMenuButton".GridMenuButtonID = ?`
      )
      .run(obj.label, obj.productId, id);

    if (result.changes != 1) {
      throw new Error('Grid menu button update did not occur.');
    }

    return;
  }

  getAllProducts(): Array<DbProduct> {
    return this.db
      .prepare(`SELECT * FROM Product ORDER BY Title ASC`)
      .all() as Array<DbProduct>;
  }

  getProductByName(productName: string): DbProduct {
    // Product names are unique
    return this.db
      .prepare(`SELECT * FROM Product WHERE Title = @Title`)
      .get({ Title: productName }) as DbProduct;
  }

  /**
   * Gets the DbProduct by product ID
   * @param id Id of Product
   * @returns DbProduct object, or undefined if not found
   */
  getProduct(id: number): DbProduct | undefined {
    // Try to find product
    let product = this.db
      .prepare('SELECT * FROM Product p WHERE p.ProductID = ?')
      .get(id) as DbProduct | undefined;

    if (!product) {
      this.logger.warn(`Product with ID ${id} was not found. `);
    }

    return product;

    // return {
    //   ProductID: ReservedProductId.ProductNotFound,
    //   Title: `${DbService.name} ${this.getProduct.name}`,
    //   Price: 0,
    //   CreatedAt: new Date().toISOString(),
    // } as DbProduct;
  }

  /**
   * Creates a new Transaction in the database.
   * @param clerkId ID of the Clerk handling the transaction.
   * @returns TransactionID of the newly created transaction.
   */
  createNewTransaction(clerkId: number): number {
    let timeStarted = new Date().toISOString();

    let transaction = {
      ClerkID: clerkId,
      TimeStarted: timeStarted,
    };

    let result = this.db
      .prepare(`INSERT INTO "Transaction" (ClerkID, TimeStarted) VALUES (?, ?)`)
      .run(transaction.ClerkID, transaction.TimeStarted);

    return result.lastInsertRowid as number;
  }

  endTransaction(transactionId: number, isVoid: boolean) {
    let timeEnded = new Date().toISOString();

    let obj = {
      TimeEnded: timeEnded,
      IsVoided: isVoid ? 1 : 0,
      TransactionID: transactionId,
    };

    let result = this.db
      .prepare(
        `
        UPDATE "Transaction"
        SET TimeEnded = @TimeEnded,
            IsVoided = @IsVoided
        WHERE TransactionID = @TransactionID
        `
      )
      .run(obj);

    if (result.changes != 1) {
      this.logger.error(
        `Transaction (ID ${transactionId}) could not be closed with the current time.`
      );
    }
    return;
  }

  // JUST FINISHED ON 2025-8-18
  /**
   * Add a TransactionDetail record to the database.
   * @param item ReceiptItem to add.
   * @param transactionId Id of master transaction
   * @returns Id of new TransactionDetail.
   */
  addTransactionDetail(item: ReceiptItem, transactionId: number): number {
    let itemJson = item.json;

    let result = this.db
      .prepare(
        `INSERT INTO "TransactionDetail" (TransactionID, ProductID, ProductTitle, Quantity, UnitPrice, IsUnitPriceOverriden) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        transactionId,
        itemJson.productId,
        itemJson.productTitle,
        itemJson.quantity,
        itemJson.unitPrice,
        itemJson.isPriceOverriden ? 1 : 0 // SQLite doesn't have boolean type
      );

    return result.lastInsertRowid as number;
  }
}
