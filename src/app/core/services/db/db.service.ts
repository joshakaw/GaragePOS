import { Injectable } from '@angular/core';
import { Database } from 'better-sqlite3';
import { DB_SCHEMA } from './schema';
import { ReceiptItem } from '../../../models/receipt-item.model';
import {
  DbGridMenuButton,
  DbProduct,
  DbProductGroup,
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

    /*
      A normal transaction should add up to zero. Since the receipt
      takes the perspective of the customer, our loss-in-value departments
      are 'positive' departments. And our gain-in-value departments
      are 'negative' departments. 

      Gain-in-Value (negative):
        Cash
        Pay In

      Loss-in-Value (positive):
        Change
        Product
        Pay Out
        Lottery Redeem

       */

    // Reserve system products (e.g. Pay In, Pay Out, Change)

    let systemProducts = [
      { id: ReservedProductId.CashPaymentChange, title: 'Change' },
      { id: ReservedProductId.PayIn, title: 'Pay In' },
      { id: ReservedProductId.PayOut, title: 'Pay Out' },
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

  getParentOfGridMenuId(selectedGridMenuId: number): number {
    var gridMenu = this.db
      .prepare('SELECT * FROM GridMenu WHERE GridMenuID = @GridMenuID')
      .get({ GridMenuID: selectedGridMenuId }) as {
      ParentGridMenuID: number;
      GridMenuID: number;
    };

    return gridMenu.ParentGridMenuID;
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
      .run({ ParentGridMenuID: parentGridMenuId });

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

    this.logger.info('Created new GridMenuButton');

    return result.lastInsertRowid as number;
  }

  updateGridMenuButton(
    id: number,
    obj: {
      label: string;
      productId: number | null;
    }
  ) {
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

  deleteGridMenuButton(
    gridMenuButtonId: number,
    submenuGridMenuId: number | null
  ) {
    let result = this.db
      .prepare(
        `DELETE FROM GridMenuButton WHERE GridMenuButtonID = @GridMenuButtonID`
      )
      .run({
        GridMenuButtonID: gridMenuButtonId,
      });

    // If it has a submenu, delete it
    if (submenuGridMenuId) {
      let submenuResult = this.db
        .prepare(`DELETE FROM GridMenu WHERE GridMenuID = @GridMenuID`)
        .run({
          GridMenuID: submenuGridMenuId,
        });

      if (submenuResult.changes == 1) {
        this.logger.info(
          'Successfully deleted submenu. (fyi - there is a cascade delete for its buttons and submenus.)'
        );
      }
    }

    if (result.changes == 1) {
      this.logger.info('Successfully deleted grid menu button.');
    }
  }

  /**
   * @returns Newly created ProductID
   */
  createProduct(title: string, price: number): number {
    let result = this.db
      .prepare(`INSERT INTO Product (Title, Price) VALUES (@Title, @Price)`)
      .run({
        Title: title,
        Price: price,
      });

    this.logger.info(
      'New product with ID ' + result.lastInsertRowid + ' was created.'
    );
    return result.lastInsertRowid as number;
  }

  getAllProducts(): Array<DbProduct> {
    return this.db
      .prepare(`SELECT * FROM Product WHERE ProductId > 100 ORDER BY Title ASC`) // WHERE disincludes system products
      .all() as Array<DbProduct>;
  }

  getAllProductsInGroup(productGroupId: number | undefined): Array<DbProduct> {
    let products = this.getAllProducts();
    if(productGroupId){
      return products.filter((item) => item.ProductGroupID == productGroupId)
    } else {
      return products;
    }
  }

  getAllProductGroups(): Array<DbProductGroup> {
    return this.db
      .prepare(`SELECT * FROM ProductGroup ORDER BY Title ASC`)
      .all() as Array<DbProductGroup>;
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
