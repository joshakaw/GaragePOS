import { Component, OnInit } from '@angular/core';
import { PresetGridButtonComponent } from '../preset-grid-button/preset-grid-button.component';
import { CommonModule } from '@angular/common';
import { DbService } from '../../core/services/db/db.service';
import { PosService } from '../../core/services/pos/pos.service';
import { DbGridMenuButton, DbProduct, ReservedGridMenuButtonLabel } from '../../models/db/product';
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

  // Copied from ConfigureComponent
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
  handleGridItemClick(item: DbGridMenuButton) {
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
    } else if (item.OnClick_Script != null) {
    }
  }

  runScriptInSandbox(command: string) {}
}
