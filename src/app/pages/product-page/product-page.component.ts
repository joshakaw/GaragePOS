import { Component } from '@angular/core';
import { DbProduct, DbProductGroup } from '../../models/db/product';
import { DbService } from '../../core/services/db/db.service';
import { CommonModule } from '@angular/common';
import { PosService } from '../../core/services/pos/pos.service';

@Component({
  selector: 'app-product-page',
  imports: [CommonModule],
  templateUrl: './product-page.component.html',
  styleUrls: ['./product-page.component.scss', '../../shared.scss'],
})
export class ProductPageComponent {
  products: Array<DbProduct> = [];
  configureMode: boolean = false;

  currentFilter: DbProductGroup | undefined;

  constructor(private _dbService: DbService, private _posService: PosService) {
    this.refreshProducts();
  }

  private refreshProducts() {
    this.products = this._dbService.getAllProductsInGroup(
      this.currentFilter?.ProductGroupID
    );
  }

  onConfigure() {
    this.configureMode = !this.configureMode;
  }

  onClick(product: DbProduct) {
    if (!this.configureMode) {
      this._posService.addItem(product);
      return;
    }

    // Configure
    this._posService.triggerPrompt({
      type: 'edit-product',
      title: 'Edit Product',
      description: '(WIP) Not implemented',
      options: ['Cancel'],
      onOptionClick: function (option: string, data: any): void {
        //throw new Error('Function not implemented.');
      },
      dismissable: false,
    });
  }

  onFilterByGroup() {
    this._posService.triggerPrompt({
      type: 'list',
      title: 'Filter by Group',
      description: 'Select the group to filter by',
      inputParams: {
        listItems: this._dbService
          .getAllProductGroups()
          .map((item) => item.Title),
        items: this._dbService.getAllProductGroups(),
        map: (item: DbProductGroup) => item.Title,
      },
      options: ['Cancel', 'Clear Filters', 'Filter'],
      onOptionClick: (
        option: string,
        data: { itemSelection: DbProductGroup }
      ): void => {
        if (option == 'Cancel') return;
        else if (option == 'Clear Filters') {
          this.currentFilter = undefined;
        } else if (option == 'Filter') {
          this.currentFilter = data.itemSelection;
        }
        this.refreshProducts();
      },
      dismissable: false,
    });
  }

  onNew() {
    this._posService.triggerPrompt({
      type: 'keyboard',
      title: 'Create a New Product',
      description: 'What title should it have?',
      options: ['Cancel', 'Continue'],
      onOptionClick: (option: string, data: { inputValue: string }): void => {
        if (option == 'Cancel') return;

        let title = data.inputValue;
        this._posService.triggerPrompt({
          type: 'numeric',
          title: 'Create a New Product',
          description: 'How much does it cost?',
          options: ['Cancel', 'Create Product'],
          onOptionClick: (option: string, data: { amount: number }): void => {
            if (option == 'Cancel') return;
            let price = data.amount;

            let id = this._dbService.createProduct(title, price);
            this.refreshProducts();
          },
          dismissable: false,
        });
        //throw new Error('Function not implemented.');
      },
      dismissable: false,
    });
  }
}
