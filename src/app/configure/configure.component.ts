import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DbService } from '../core/services/db/db.service';
import {
  DbGridMenuButton,
  DbProduct,
  ReservedGridMenuButtonLabel,
} from '../models/db/product';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { PosService } from '../core/services/pos/pos.service';

// TODO: This logic mirrors the PresetGridComponent very much.
// Add onclick event listeners to PresetGridComponent to allow this to utilize the
// same logic (DRY)

@Component({
  selector: 'app-configure',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './configure.component.html',
  styleUrl: './configure.component.scss',
})
export class ConfigureComponent implements OnInit {
  width: number = 7;
  height: number = 5;
  gridItems: Array<DbGridMenuButton> = Array(this.width * this.height);

  protected selectedGridMenuId: number = 1; // 1=Main menu by default

  form!: FormGroup;

  constructor(
    private _router: Router,
    private _dbService: DbService,
    private _posService: PosService,
    private logger: NGXLogger
  ) {
    this.form = new FormGroup({
      gridMenuButtonId: new FormControl(''),
      label: new FormControl(''),
      productId: new FormControl(''),
      defaultQuantity: new FormControl('1'),
      x: new FormControl('1'),
      y: new FormControl('1'),
    });
  }

  ngOnInit(): void {
    this.refreshGridItems();

    // Disable gridMenuButtonId
    this.form.controls['gridMenuButtonId'].disable();
    this.form.controls['defaultQuantity'].disable();
    this.form.controls['x'].disable();
    this.form.controls['y'].disable();
  }

  refreshGridItems(): void {
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

    this.logger.info(
      `Grid items refreshed. Grid ID: ${this.selectedGridMenuId}`
    );
  }

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
          OnClick_Script: null,
          OnClick_OpenGridMenuID: null,
          OnClick_AddProductID: null,
        };
        tempGridItemsArray.push(a);
      }
    }

    return tempGridItemsArray;
  }

  /**
   * Action when a grid item is clicked.
   * Patch grid item values into associated child form.
   * @param item Grid menu button that was clicked.
   * @param index The index of the grid item
   */
  onClickGridItem(item: DbGridMenuButton, index: number) {
    // TODO: In case submenu (has a menu onclick action), open it and refresh
    if (item?.Label == '<BLANK>') {
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
              inputParams: { listItems: allProducts },
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

      return;
    } else {
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
    }

    let coords = this.getXYFromIndex(index);

    this.form.patchValue({
      gridMenuButtonId: item?.GridMenuButtonID,
      label: item?.Label,
      productId: item?.OnClick_AddProductID,
      x: coords.x,
      y: coords.y,
    });
  }

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

  /**
   * On submitting the tile edit modal.
   */
  onSubmit() {
    let gridMenuButtonId = this.form.controls['gridMenuButtonId'].value;
    let label = this.form.controls['label'].value;
    let productId = this.form.controls['productId'].value;
    let defaultQuantity = this.form.controls['defaultQuantity'].value;
    let x = this.form.controls['x'].value;
    let y = this.form.controls['y'].value;

    // Create the grid menu button if it doesn't exist
    if (gridMenuButtonId == -1) {
      try {
        this._dbService.createGridMenuButton({
          GridMenuButtonID: -1,
          GridMenuID: this.selectedGridMenuId,
          ImageID: null,
          Label: label,
          X: x,
          Y: y,
          W: 1,
          H: 1,
          OnClick_Script: null,
          OnClick_OpenGridMenuID: null,
          OnClick_AddProductID: productId,
        });
      } catch (err) {
        if (err instanceof Error) {
          console.error(err.message);
          this.logger.warn('Could not create grid item due to a conflict.');
        }
      }

      return;
    }

    // If it does exist, update it.
    let obj = {
      label: label,
      productId: productId,
      defaultQuantity: defaultQuantity,
    };
    this._dbService.updateGridMenuButton(gridMenuButtonId, obj);

    this.refreshGridItems();
  }

  onGoBack() {
    this._router.navigate(['pos']);
  }
}
