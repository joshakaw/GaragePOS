import { Component } from '@angular/core';
import { DbProduct } from '../../models/db/product';
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
  products: Array<DbProduct>;

  constructor(private _dbService: DbService, private _posService: PosService) {
    this.products = this._dbService.getAllProducts();
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
            let price = data.amount

            let id = this._dbService.createProduct(title, price);
            alert(id);
          },
          dismissable: false,
        });
        //throw new Error('Function not implemented.');
      },
      dismissable: false,
    });
  }
}
