import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  OnDestroy,
  OnInit,
  Signal,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { ReceiptComponent } from './receipt/receipt.component';
import { CommonModule } from '@angular/common';
import { ReceiptItem } from './models/receipt-item.model';
import { BasicPromptComponent } from './prompts/basic-prompt/basic-prompt.component';
import { PosService } from './core/services/pos/pos.service';
import { PresetGridComponent } from './preset-area/preset-grid/preset-grid.component';
import { DbService } from './core/services/db/db.service';
import { PromptFactory } from './core/factories/prompt-factory';
import { TransactionService } from './core/services/transaction/transaction.service';
import {
  DbGridMenuButton,
  DbProduct,
  ReservedProductId,
} from './models/db/product';
import { Router, RouterOutlet, RouterLinkWithHref, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfigureComponent } from './configure/configure.component';
import { ListPromptComponent } from './prompts/list-prompt/list-prompt.component';
import { ElectronService } from './core/services';
import { TranslateService } from '@ngx-translate/core';
import { APP_CONFIG } from '../environments/environment';

/**
 * Component that handles main POS UI, and the data it displays.
 */
@Component({
  selector: 'app-root',
  imports: [
    ReceiptComponent,
    CommonModule,
    PresetGridComponent,
    ConfigureComponent,
    RouterOutlet,
    RouterLinkWithHref,
    RouterLinkActive
],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild(ReceiptComponent) receiptViewer!: ReceiptComponent;
  @ViewChild('promptHost', { read: ViewContainerRef, static: true })
  promptHost!: ViewContainerRef;

  /**
   * Index of selected item in receiptItemList.
   * If null, the getter will determine the selected item.
   */
  private _selectedItemIndex: number | null = null;

  promptActive: boolean = false;

  /** ID of current Transaction being tracked. */
  protected currentTransactionId: number | null = null;

  /** Configuration mode */
  //protected configureActive = false;
  protected get configureActive() {
    return this._router.url == '/configure';
  }

  // State

  // Transaction is the main screen right now, no prompts
  protected get isActiveTransaction(): boolean {
    return this.currentTransactionId != undefined && !this.promptActive;
  }

  items: Array<ReceiptItem> = [];

  constructor(
    private _posService: PosService,
    private _dbService: DbService,
    private _transactionService: TransactionService,
    private _router: Router,
    private electronService: ElectronService,
    private translate: TranslateService
  ) {
    this.translate.setDefaultLang('en');
    console.log('APP_CONFIG', APP_CONFIG);

    if (electronService.isElectron) {
      console.log(process.env);
      console.log('Run in electron');
      console.log('Electron ipcRenderer', this.electronService.ipcRenderer);
      console.log('NodeJS childProcess', this.electronService.childProcess);
    } else {
      console.log('Run in browser');
    }

    _posService.prompt$.pipe(takeUntilDestroyed()).subscribe((params) => {
      // Clear any previous prompt
      this.promptHost.clear();

      // If null, no more prompts to display.
      if (!params) {
        this.promptActive = false;
        return;
      }

      // If not null, create the next prompt for display
      let component = PromptFactory.createPromptComponent(params.type);
      const componentRef = this.promptHost.createComponent(component);
      componentRef.instance.setParams(params);

      this.promptActive = true;
    });

    _posService
      .onItemAdded()
      .pipe(takeUntilDestroyed())
      .subscribe((product) => this.onItemAdded(product));
  }
  /** Performs on initialization */
  ngOnInit(): void {}

  ngOnDestroy(): void {
    this._posService.promptHandled();
  }

  set selectedItemIndex(value: number | null) {
    if (value == null) {
      this._selectedItemIndex = null;
    } else if (isValidIndex(this.items, value)) {
      this._selectedItemIndex = value;
    }
  }

  /**
   * Gets the selected item index. If value is null,
   * the last item is automatically selected.
   */
  get selectedItemIndex(): number | null {
    if (this.items.length == 0) {
      return null;
    }
    if (this._selectedItemIndex == null) {
      return this.items.length - 1;
    } else {
      return this._selectedItemIndex;
    }
  }

  get selectedItem(): ReceiptItem | null {
    if (this.selectedItemIndex == null) {
      return null;
    }
    return this.items[this.selectedItemIndex];
  }

  get hasSelectedItem(): boolean {
    return this.selectedItemIndex != null;
  }

  /**
   * Removes the selected item. If nothing is
   * selected, there is no effect.
   * @returns True if an item was removed, false
   * if no item is selected.
   */
  public removeSelectedItem(): boolean {
    if (!this.hasSelectedItem) {
      return false;
    }

    // Add the voided item to the database, with quantity 0 to indicate it was voided
    this.items[this.selectedItemIndex!].quantity = 0;
    this._dbService.addTransactionDetail(
      this.items[this.selectedItemIndex!],
      this.currentTransactionId!
    );

    // Remove the item from local array
    this.items.splice(this.selectedItemIndex!, 1);

    // Move the selected item index
    if (typeof this.items[this._selectedItemIndex! - 1] != 'undefined') {
      this._selectedItemIndex = this._selectedItemIndex! - 1;
    } else {
      this._selectedItemIndex = null;
    }

    return true;
  }

  private onItemAdded(product: DbProduct) {
    // Start a new transaction if not already started
    if (!this.currentTransactionId) {
      // Resets a closed transaction with items still appearing on receipt.
      this.items = [];
      this.selectedItemIndex = null;

      this.currentTransactionId = this._dbService.createNewTransaction(1);
    }

    this.items.push(
      this._transactionService.createReceiptItem(product.ProductID)
    );

    this.receiptViewer.selectedItemIndex = null;
  }

  onVoidTransaction() {
    this.closePayment(true);
  }

  onQuantityChange() {
    if (!this.currentTransactionId || this.promptActive) {
      return;
    }

    if (!this.hasSelectedItem) {
      return;
    }
    this._posService.triggerPrompt({
      title: 'Change Quantity',
      description: 'Enter new quantity:',
      type: 'numeric',
      options: ['Cancel', 'Enter'],
      dismissable: true,
      onOptionClick: (btnLbl, data) => {
        let numericData = data as { amount: number };

        if (btnLbl == 'Enter' && this.hasSelectedItem) {
          this.selectedItem!.quantity = numericData.amount;
        }
      },
    });
  }

  onVoidItem() {
    if (!this.currentTransactionId || this.promptActive) {
      return;
    }

    this.removeSelectedItem();
  }

  onPriceOverride() {
    if (!this.currentTransactionId || this.promptActive) {
      return;
    }

    if (!this.hasSelectedItem) {
      return;
    }
    this._posService.triggerPrompt({
      title: 'Price Override',
      description: 'Enter new price:',
      type: 'numeric',
      options: ['Cancel', 'Enter'],
      dismissable: true,
      onOptionClick: (btnLbl, data) => {
        let numericData = data as { amount: number };
        if (btnLbl == 'Enter' && this.hasSelectedItem) {
          this.selectedItem!.unitPrice = numericData.amount;
        }
      },
    });
  }

  navigateConditional(url: string) {
    if(this.isActiveTransaction || this.promptActive){
      return;
    }
    this._router.navigate([url]);
  }
  onConfigureGrid() {
    if (this.promptActive || this.currentTransactionId) {
      return;
    }

    if (this._router.url == '/configure') {
      this._router.navigate(['grid']);
    } else {
      this._router.navigate(['configure']);
    }

    // this._router.navigate(['configure']);
  }

  onSafeDrop() {
    this._posService.triggerPrompt({
      title: 'Safe Drop Needed',
      description: 'Perform safe drop now?',
      dismissable: false,
      type: 'basic',
      options: ['No', 'Yes'],
      onOptionClick: function () {},
    });
  }

  onCashPayment() {
    if (!this.currentTransactionId || this.promptActive) {
      return;
    }
    this._posService.triggerPrompt({
      title: 'Cash Payment',
      description: 'Enter amount received:',
      type: 'numeric',
      options: ['Cancel', 'Enter'],
      dismissable: true,
      onOptionClick: (btnLbl, data) => {
        let numericData = data as { amount: number };
        if (btnLbl == 'Enter') {
          // Handle cash payment logic here
          this.handleCashPayment(numericData.amount);
        }
      },
    });
  }

  handleCashPayment(amountReceived: number) {
    alert(`Cash payment of ${amountReceived} received.`);

    let totalDue = this._transactionService.total(this.items);

    if (amountReceived < totalDue) {
      alert('Insufficient amount received. Please try again.');
      return;
    }

    // Create cashpayment TransactionDetail
    this.items.push(
      this._transactionService.createReceiptItem(
        ReservedProductId.CashPayment,
        1,
        amountReceived * -1
      )
    );

    // Create change TransactionDetail
    let changeAmount = amountReceived - totalDue;
    if (changeAmount < 0)
      throw new Error('Change amount should be positive or 0.');
    this.items.push(
      this._transactionService.createReceiptItem(
        ReservedProductId.CashPaymentChange,
        1,
        changeAmount
      )
    );

    this.closePayment();
  }

  /**
   * Open a series of prompts to test.
   */
  promptTest() {
    this._posService.triggerPrompt({
      title: 'My Title',
      description: 'My Description',
      dismissable: false,
      type: 'numeric',
      options: ['Cancel', 'Enter'],
      onOptionClick: function (btnLbl, data) {
        let numericData = data as { amount: number };
        if (btnLbl == 'Enter') {
          alert(numericData.amount);
        }
      },
    });
  }

  /**
   * Stores the transaction line items to the
   * database, and resets.
   *
   * @param [isVoid=false] Voided transaction?
   */
  closePayment(isVoid: boolean = false) {
    if (!this.currentTransactionId) {
      return;
    }

    // Add line items
    for (let item of this.items) {
      this._dbService.addTransactionDetail(item, this.currentTransactionId);
    }

    this._dbService.endTransaction(this.currentTransactionId, isVoid);

    this.currentTransactionId = null;

    // this._posService.triggerPrompt({
    //   title: 'Transaction finished.',
    //   description: 'Press Start to begin next transaction.',
    //   dismissable: false,
    //   type: 'basic',
    //   options: ['Start'],
    //   onOptionClick: (btnLbl, data) => {
    //     if (btnLbl == 'Start') {
    //       // Reset
    //       this.items = [];
    //       this.currentTransactionId = null;
    //       this.selectedItemIndex = null;
    //     }
    //   },
    // });
  }
}

function isValidIndex(arr: any[], index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < arr.length;
}
