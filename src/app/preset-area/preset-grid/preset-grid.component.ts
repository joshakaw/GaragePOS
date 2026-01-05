import { Component, OnInit } from '@angular/core';
import { PresetGridButtonComponent } from '../preset-grid-button/preset-grid-button.component';
import { CommonModule } from '@angular/common';
import { DbService } from '../../core/services/db/db.service';
import { PosService } from '../../core/services/pos/pos.service';
import {
  DbGridMenuButton,
  DbProduct,
  ReservedGridMenuButtonLabel,
} from '../../models/db/product';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-preset-grid',
  imports: [CommonModule],
  templateUrl: './preset-grid.component.html',
  styleUrl: './preset-grid.component.scss',
})
export class PresetGridComponent implements OnInit {
  width: number = 7;
  height: number = 5;
  gridItems: Array<DbGridMenuButton> = Array(this.width * this.height);
  configureMode: boolean = false;

  protected hasParent: boolean = false;

  protected selectedGridMenuId: number = 1; // 1=Main menu by default

  /** Defines the buttons on this page, placement, etc */
  gridLayoutId: number;

  constructor(
    private _dbService: DbService,
    private _posService: PosService,
    private logger: NGXLogger
  ) {
    this.gridLayoutId = 1;
  }

  ngOnInit(): void {
    //this.gridItems = this._dbService.getGridItems(1);
    this.refreshGridItems();
  }

  goBack() {
    this.selectedGridMenuId = this._dbService.getParentOfGridMenuId(
      this.selectedGridMenuId
    );
    this.refreshGridItems();
  }

  onConfigure() {
    this.configureMode = !this.configureMode;
  }

  // Copied from ConfigureComponent
  refreshGridItems(): void {
    if (!this._dbService.getParentOfGridMenuId(this.selectedGridMenuId)) {
      this.hasParent = false;
    } else {
      this.hasParent = true;
    }

    this.gridItems = this.createBlankGridItemArray(7, 5);
    // Get menu
    let dbGrid = this._dbService.getGridItems(this.selectedGridMenuId);

    // Populate the grid from DB.
    for (let i = 0; i < this.gridItems.length; i++) {
      let pos: { x: number; y: number } = this.getXYFromIndex(i);
      let gridItem = dbGrid.find((obj) => obj.X == pos.x && obj.Y == pos.y);
      if (typeof gridItem != 'undefined') {
        this.gridItems[i] = gridItem;
      } else {
        continue;
      }
    }

    this.logger.info('Grid items refreshed.');
  }

  // Copied from configure component
  /**
   * Creates an initial blank grid item array
   * @param width X Size
   * @param height Y Size
   */
  private createBlankGridItemArray(width: number, height: number) {
    let tempGridItemsArray: DbGridMenuButton[] = [];
    for (let y = 1; y <= height; y++) {
      for (let x = 1; x <= width; x++) {
        let a: DbGridMenuButton = {
          X: x,
          Y: y,
          GridMenuButtonID: -1, // Unknown ID
          GridMenuID: this.selectedGridMenuId,
          ImageID: null,
          Label: ReservedGridMenuButtonLabel.Invisible,
          W: 1,
          H: 1,
          OnClick_Script: '',
          OnClick_OpenGridMenuID: null,
          OnClick_AddProductID: null,
        };
        tempGridItemsArray.push(a);
      }
    }

    return tempGridItemsArray;
  }

  // Copied from configure componet
  /**
   * Calculates the X,Y coordinates based off of the
   * current grid size.
   * @param index  Index of the grid item
   * @returns X, Y coordinates (1-based) of grid items
   */
  private getXYFromIndex(index: number): { x: number; y: number } {
    let x = (index % this.width) + 1;
    let y = Math.floor(index / this.width) + 1;
    return { x, y };
  }

  /**
   * Handles any of the possible OnClick operations
   * defined for this grid button.
   * @param item Item that was clicked
   */
  handleGridItemClick(item: DbGridMenuButton, index: number) {
    if (this.configureMode) {
      return this.handleGridItemClickConfigure(item, index);
    }
    if (item.OnClick_AddProductID) {
      // Get Product
      let product = this._dbService.getProduct(item.OnClick_AddProductID);
      // Fire event
      if (product) {
        this._posService.addItem(product);
      }
      // Doesn't exist (1) return undefined (2) throw error (3) return ProductNotFound product obj
      // (3) Code still works even if don't handle bad case, silently fails
      // Correct method of handling database means that products
      // are never deleted, and we can avoid a bad case from happening.
    } else if (item.OnClick_OpenGridMenuID != null) {
      this.selectedGridMenuId = item.OnClick_OpenGridMenuID;
      this.refreshGridItems();
    } else if (item.OnClick_Script != null) {
    }
  }

  handleGridItemClickConfigure(item: DbGridMenuButton, index: number) {
    this.logger.info(item);
    if (item.OnClick_AddProductID) {
      // Product tile
      this._posService.triggerPrompt({
        type: 'edit-tile',
        title: 'Edit Tile',
        description: 'Modify tile appearance',
        inputParams: {
          gridMenuButton: item,
        },
        options: ['Delete', 'Cancel', 'Save'],
        onOptionClick: (option: string, data: any): void => {
          if (option == 'Delete') {
            this._posService.triggerPrompt({
              type: 'basic',
              title: 'Confirm',
              description: 'Are you sure?',
              options: ['Yes', 'No'],
              onOptionClick: (option, data) => {
                if (option == 'Yes') {
                  this._dbService.deleteGridMenuButton(
                    item.GridMenuButtonID,
                    item.OnClick_OpenGridMenuID
                  );
                }

                this.refreshGridItems();
              },
              dismissable: false,
            });
          } else if (option == 'Save') {
            this._dbService.updateGridMenuButton(item.GridMenuButtonID, {
              label: data.newLabel,
              productId: item.OnClick_AddProductID,
            });

            this.refreshGridItems();
          }
        },
        dismissable: false,
      });
    } else if (item.OnClick_OpenGridMenuID) {
    } else if (item.OnClick_Script) {
    } else {
      // Blank tile
      this._posService.triggerPrompt({
        title: 'Modify Blank Tile',
        description: 'What action do you want this tile to perform?',
        type: 'basic',
        options: ['Add Product', 'Open Submenu', 'Cancel'],
        dismissable: true,
        onOptionClick: (btnLbl, data) => {
          if (btnLbl == 'Add Product') {
            let allProducts = this._dbService
              .getAllProducts()
              .map((item) => item.Title);

            this._posService.triggerPrompt({
              type: 'list',
              title: 'Tile Action: Add Product',
              description: 'Select the product to add on click',
              inputParams: {
                listItems: allProducts,
                items: this._dbService.getAllProducts(),
                map: (item: DbProduct) => item.Title,
              },
              options: ['Cancel', 'Select'],
              onOptionClick: (option: string, data: any): void => {
                if (option == 'Select') {
                  this.initializeAddProductGridItem(
                    item,
                    index,
                    data.listItemSelection
                  );
                }
              },
              dismissable: true,
            });
            // Create this GridMenuButton, if doesn't exist
            // Update the GridMenuButton
          } else if (btnLbl == 'Open Submenu') {
            // Create GridMenuButton at this position, if it doesn't exist

            this._posService.triggerPrompt({
              type: 'keyboard',
              title: 'Tile Action: Open Submenu',
              description: 'What should the menu be called?',
              options: ['Cancel', 'Enter'],
              onOptionClick: (option: string, data: any): void => {
                if (option == 'Enter') {
                  this.createSubmenuAndOpen(item, index, data.inputValue);
                }
              },
              dismissable: true,
            });

            // Change onclick action of this GridMenuButton
            // Refresh page so it appears as a submenu
          }
        },
      });
    }
  }

  private createSubmenuAndOpen(
    item: DbGridMenuButton,
    index: number,
    name: string
  ) {
    if (item.GridMenuButtonID == -1) {
      // Create gridmenu
      let newGridMenuId = this._dbService.createGridMenu(
        this.selectedGridMenuId
      );

      try {
        this._dbService.createGridMenuButton({
          GridMenuButtonID: -1,
          GridMenuID: this.selectedGridMenuId,
          ImageID: null,
          Label: name,
          X: item.X,
          Y: item.Y,
          W: 1,
          H: 1,
          OnClick_Script: null,
          OnClick_OpenGridMenuID: newGridMenuId,
          OnClick_AddProductID: null,
        });
      } catch (err) {
        if (err instanceof Error) {
          console.error(err.message);
          this.logger.warn('Could not create grid item due to a conflict.');
        }
      }

      this.logger.info(
        `Creating submenu - changing selected Grid Menu ID ${this.selectedGridMenuId} to ${newGridMenuId}`
      );

      this.selectedGridMenuId = newGridMenuId;

      this.refreshGridItems();
    }
  }

  initializeAddProductGridItem(
    item: DbGridMenuButton,
    index: number,
    productName: string
  ) {
    let productInfo: DbProduct = this._dbService.getProductByName(productName);
    if (item.GridMenuButtonID == -1) {
      try {
        this._dbService.createGridMenuButton({
          GridMenuButtonID: -1,
          GridMenuID: this.selectedGridMenuId,
          ImageID: null,
          Label: productName,
          X: item.X,
          Y: item.Y,
          W: 1,
          H: 1,
          OnClick_Script: null,
          OnClick_OpenGridMenuID: null,
          OnClick_AddProductID: productInfo.ProductID,
        });
      } catch (err) {
        if (err instanceof Error) {
          console.error(err.message);
          this.logger.warn('Could not create grid item due to a conflict.');
        }
      }
    }

    this.refreshGridItems();
  }

  runScriptInSandbox(command: string) {}
}
