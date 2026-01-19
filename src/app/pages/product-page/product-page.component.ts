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

  constructor(
    private _dbService: DbService,
    private _posService: PosService,
  ) {
    this.refreshProducts();
  }

  private refreshProducts() {
    this.products = this._dbService.getAllProductsInGroup(
      this.currentFilter?.ProductGroupID,
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
      type: 'list',
      title: 'Edit Product',
      description: 'Select a product property to modify:',
      inputParams: {
        items: [
          { action: 'Title', current: `${product.Title}` },
          { action: 'Price', current: `\$${product.Price.toFixed(2)}` },
          {
            action: 'Group',
            current: `${this._dbService.getProductGroupTitle(product.ProductGroupID) ?? 'None'}`,
          },
        ],
        map: (item: any) => item.action + ': ' + item.current,
      },
      options: ['Cancel', 'OK'],
      onOptionClick: (option: string, data: any): void => {
        if (option == 'Cancel') return;
        if (data.itemSelection.action == 'Price') {
          this._posService.triggerPrompt({
            type: 'numeric',
            title: 'Edit Product: Price',
            description: 'What price should the product have instead?',
            options: ['Cancel', 'Done'],
            onOptionClick: (option: string, data: any) => {
              if (option == 'Done') {
                this._dbService.patchProduct(product.ProductID, {
                  Price: data.amount,
                });
                this.refreshProducts();
              }
            },
            dismissable: false,
          });
        } else if (data.itemSelection.action == 'Title') {
          this._posService.triggerPrompt({
            type: 'keyboard',
            title: 'Edit Product: Title',
            description: 'What title should the product have?',
            options: ['Done', 'Cancel'],
            inputParams: {
              startingInputValue: product.Title,
            },
            onOptionClick: (option: string, data: any): void => {
              if (option == 'Done') {
                this._dbService.patchProduct(product.ProductID, {
                  Title: data.inputValue,
                });
                this.refreshProducts();
              }
            },
            dismissable: false,
          });
        } else if (data.itemSelection.action == 'Group') {
          this._posService.triggerPrompt({
            type: 'list',
            title: 'Edit Product: Group',
            description: 'What group is the product in?',
            options: ['Cancel', 'Set'],
            inputParams: {
              items: [
                { ProductGroupID: null, Title: '* None' },
                // TODO: Add New Group functionality
                //{ ProductGroupID: -98, Title: '* Add New Group' },
                ...this._dbService.getAllProductGroups(),
              ] as Array<DbProductGroup>,
              map: (item: DbProductGroup) => item.Title,
            },
            onOptionClick: (
              option: string,
              data: { itemSelection: DbProductGroup },
            ): void => {
              if (data.itemSelection.ProductGroupID == -98) {
                // Add New Group
                return;
              }
              this._dbService.patchProduct(product.ProductID, {
                ProductGroupID: data.itemSelection.ProductGroupID,
              });

              this.refreshProducts();
            },
            dismissable: false,
          });
        }
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
        data: { itemSelection: DbProductGroup },
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
      inputParams: {
        startingInputValue: '',
      },
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
