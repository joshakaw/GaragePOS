import {
  Component,
  OnDestroy,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { ReceiptComponent } from './receipt/receipt.component';
import { CommonModule } from '@angular/common';
import { ReceiptItem } from './models/receipt-item.model';
import { PosService } from './core/services/pos/pos.service';
import { DbService } from './core/services/db/db.service';
import { PromptFactory } from './core/factories/prompt-factory';
import { TransactionService } from './core/services/transaction/transaction.service';
import {
  DbProduct,
  DbTransaction,
  ReservedProductId,
} from './models/db/product';
import {
  Router,
  RouterOutlet,
  RouterLinkWithHref,
  RouterLinkActive,
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
    RouterOutlet,
    RouterLinkWithHref,
    RouterLinkActive,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
})
export class AppComponent implements OnDestroy {
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

  protected cashboxAmount: number;

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
    private translate: TranslateService,
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
    this.cashboxAmount = this._dbService.getCashboxAmount();

    _posService.prompt$.pipe(takeUntilDestroyed()).subscribe((params) => {
      // Clear any previous prompt
      this.promptHost.clear();

      // If null, no more prompts to display.
      if (!params) {
        this.promptActive = false;
        return;
      }

      // If not null, create the next prompt for display
      const component = PromptFactory.createPromptComponent(params.type);
      const componentRef = this.promptHost.createComponent(component);
      componentRef.instance.setParams(params);

      this.promptActive = true;
    });

    _posService
      .onItemAdded()
      .pipe(takeUntilDestroyed())
      .subscribe((product) => this.onItemAdded(product));
  }

  ngOnDestroy(): void {
    this._posService.promptHandled();
  }

  set selectedItemIndex(value: number | null) {
    if (isValidIndex(this.items, value ?? -1)) {
      this._selectedItemIndex = value;
    } else {
      this._selectedItemIndex = null;
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
      this.currentTransactionId!,
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
      this._transactionService.createReceiptItem(product.ProductID),
    );

    this.receiptViewer.selectedItemIndex = null;
  }

  onVoidTransaction() {
    this.closePayment(true);
  }

  // A transaction without a TimeEnded is considered a Saved Transaction.
  // There may be alternative names for "Saved Transaction".
  onSaveTransaction() {
    // Simply set currentTransactionId to null.
    this.closePayment(false, true);
  }

  // "Click to Resume/Recall #XXX" could appear
  //
  onRecallTransaction() {
    // Display a list of Saved Transactions, similar to Previous Receipts menu.
    // Will display corresponding receipt on left when it is highlighted.
    // 1:
    // 2:
    // ...
    // [Cancel, Resume]

    this._posService.triggerPrompt({
      type: 'list',
      title: 'Unfinished Transactions',
      description: 'Press a transaction to view or resume',
      options: ['Cancel', 'Resume'],
      inputParams: {
        list: this._dbService.listRecentTransactions(),
      },
      onOptionClick: function (): void {
        throw new Error('Function not implemented.');
      },
      dismissable: false,
    });
  }

  onCashbox() {
    // List prompt
    // options: Pay In, Pay Out, Count Drawer
    //
    if (this.currentTransactionId || this.promptActive) {
      return;
    }
    this._posService.triggerPrompt({
      type: 'list',
      title: 'Manage Cashbox',
      description: 'Select an option',
      options: ['Cancel', 'Done'],
      inputParams: {
        items: ['Pay In', 'Pay Out', 'Count & Adjust'],
        map: (item: string) => item,
      },
      onOptionClick: (option: string, data: { itemSelection: string }) => {
        //throw new Error('Function not implemented.');
        if (option == 'Cancel') return;
        if (data.itemSelection == 'Pay In') {
          this._posService.triggerPrompt({
            type: 'numeric',
            title: 'Pay In Amount',
            description: 'How much money is entering the cashbox?',
            options: ['Cancel', 'Done'],
            onOptionClick: (option: string, data: any) => {
              if (option == 'Cancel') return;
              this._posService.addItem({
                ProductID: ReservedProductId.PayIn,
                Title: '0',
                Price: 0.0,
                ProductGroupID: null,
                CreatedAt: '',
              });

              // Incoming amounts (like cash payment) are negative on receipt
              this.selectedItem!.unitPrice = data.amount * -1;

              this.selectedItem!.name = 'Pay In';
              this.closePayment();
            },
            dismissable: false,
          });
        } else if (data.itemSelection == 'Pay Out') {
          this._posService.triggerPrompt({
            type: 'numeric',
            title: 'Pay Out Amount',
            description: 'How much money is leaving the cashbox?',
            options: ['Cancel', 'Done'],
            onOptionClick: (option: string, data: any) => {
              if (option == 'Cancel') return;
              this._posService.addItem({
                ProductID: ReservedProductId.PayOut,
                Title: '0',
                Price: 0.0,
                ProductGroupID: null,
                CreatedAt: '',
              });

              // Incoming amounts (like cash payment) are negative on receipt
              this.selectedItem!.unitPrice = data.amount;

              this.selectedItem!.name = 'Pay Out';
              this.closePayment();
            },
            dismissable: false,
          });
        } else if (data.itemSelection == 'Count & Adjust') {
          this._posService.triggerPrompt({
            type: 'numeric',
            title: 'Count Your Cashbox',
            description: 'How much money is in your cashbox?',
            options: ['Cancel', 'Done'],
            onOptionClick: (option: string, data: any) => {
              if (option == 'Cancel') return;

              const registeredAmt = this._dbService.getCashboxAmount();
              const countedAmt = data.amount;

              const adjustment = registeredAmt - countedAmt;
              if (adjustment < 0) {
                // Over (positive adjustment = money out)
              } else if (adjustment > 0) {
                // Short (negative adjustment = money in)
              }

              this._posService.addItem({
                ProductID: ReservedProductId.CashboxAdjustment,
                Title: '0',
                Price: 0.0,
                ProductGroupID: null,
                CreatedAt: '',
              });

              // Incoming amounts (like cash payment) are negative on receipt
              this.selectedItem!.unitPrice = adjustment;

              this.selectedItem!.name = 'Cashbox Adjustment';
              this.closePayment();
            },
            dismissable: false,
          });
        }
      },
      dismissable: false,
    });
  }

  onViewPreviousTransactions() {
    if (this.currentTransactionId || this.promptActive) {
      return;
    }

    this._posService.triggerPrompt({
      type: 'list',
      title: 'Previous Transactions',
      description: 'Click a transaction to display',
      inputParams: {
        items: [
          ...this._dbService.listSavedTransactions(),
          ...this._dbService.listRecentTransactions(),
        ],
        map: (item: DbTransaction) => {
          if (item.TimeEnded) {
            return `#${item.TransactionID} (${new Date(item.TimeEnded).toLocaleString()})`;
          } else {
            return `#${item.TransactionID} (Saved for Recall)`;
          }
        },
        onFocus: (item: DbTransaction) => {
          this.currentTransactionId = item.TransactionID;
          this.items = this._transactionService.rebuildReceiptItems(
            item.TransactionID,
          );
          this.selectedItemIndex = null;
          this.receiptViewer.memo = item.Memo;
        },
      },
      options: ['Close', 'Recall'],
      onOptionClick: (
        option: string,
        data: { itemSelection: DbTransaction },
      ): void => {
        if (option == 'Recall') {
          if (!data.itemSelection.TimeEnded) {
            return;
          } else {
            this._posService.triggerPrompt({
              type: 'basic',
              title: 'Transaction Not Recallable',
              description: 'Only unfinished transactions can be recalled. You will now be returned home.',
              options: ['OK'],
              onOptionClick: function (): void {
                // Empty
              },
              dismissable: false,
            });
          }
        }

        this.currentTransactionId = null;
        this.selectedItemIndex = null;
        this.receiptViewer.memo = '';

        if (this.items.length > 0) {
          // Workaround to get the highlight bar back to the top
          this.items = [this.items[0]];
          //this.receiptViewer.
        }
        this.items = [];
      },
      dismissable: false,
    });
  }

  onModifyTransaction() {
    if (this.currentTransactionId == null || this.promptActive) {
      return;
    }

    this._posService.triggerPrompt({
      type: 'list',
      title: 'Manage Transaction',
      description: '',
      options: ['Cancel', 'OK'],
      inputParams: {
        items: ['Save for Recall', 'Attach Memo'],
        map: (item: string) => item,
      },
      onOptionClick: (
        option: string,
        data: { itemSelection: string },
      ): void => {
        if (data.itemSelection == 'Save for Recall') {
          /*
          An empty transaction could be recalled if a
          previous clerk wants to leave a memo for a future clerk,
          aka "Please credit the customer of this transaction $5, because
          they left it on the counter yesterday. They will tell you this
          transaction number to recall to use their store credit."
          */
          this.onSaveTransaction();
        } else if (data.itemSelection == 'Attach Memo') {
          this._posService.triggerPrompt({
            type: 'keyboard',
            title: 'Attach Memo',
            description: 'What is your message?',
            options: ['Cancel', 'Save'],
            inputParams: {
              startingInputValue: this.receiptViewer.memo,
              onEnterOption: 'Save',
            },
            onOptionClick: (
              option: string,
              data: { inputValue: string },
            ): void => {
              if (option == 'Cancel') return;
              this._dbService.updateTransactionMemo(
                this.currentTransactionId!,
                data.inputValue,
              );
              this.receiptViewer.memo = data.inputValue;
            },
            dismissable: false,
          });
        }
      },
      dismissable: true,
    });
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
        const numericData = data as { amount: number };

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
        const numericData = data as { amount: number };
        if (btnLbl == 'Enter' && this.hasSelectedItem) {
          this.selectedItem!.unitPrice = numericData.amount;
        }
      },
    });
  }

  navigateConditional(url: string, blockDuringTransaction: boolean) {
    if (
      (this.isActiveTransaction && blockDuringTransaction) ||
      this.promptActive
    ) {
      return;
    }
    void this._router.navigate([url]);
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
      inputParams: {
        presets: ['Exact Dollar', 'Next Dollar', '$5', '$10'],
        defaultOption: 'Enter',
      },
      dismissable: true,
      onOptionClick: (btnLbl, data: { amount: number; preset?: string }) => {
        let amount = data.amount;
        const totalDue = this._transactionService.totalDue(this.items);
        if (data.preset) {
          switch (data.preset) {
            case 'Exact Dollar':
              amount = totalDue;
              break;
            case 'Next Dollar':
              amount = Math.ceil(totalDue);
              break;
            case '$5':
              amount = 5;
              break;
            case '$10':
              amount = 10;
              break;
          }
        }

        if (btnLbl == 'Enter') {
          // Handle cash payment logic here
          this.handleCashPayment(amount);
        }
      },
    });
  }

  handleCashPayment(amountReceived: number) {
    //alert(`Cash payment of ${amountReceived} received.`);

    const totalDue = this._transactionService.totalDue(this.items);

    // Create cashpayment TransactionDetail
    this.items.push(
      this._transactionService.createReceiptItem(
        ReservedProductId.CashPayment,
        1,
        amountReceived * -1,
      ),
    );

    if (amountReceived < totalDue) {
      // Cannot close, expecting more money
      return;
    }

    // Create change TransactionDetail
    const changeAmount = amountReceived - totalDue;
    if (changeAmount < 0)
      throw new Error('Change amount should be positive or 0.');
    this.items.push(
      this._transactionService.createReceiptItem(
        ReservedProductId.CashPaymentChange,
        1,
        changeAmount,
      ),
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
        const numericData = data as { amount: number };
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
   * @param [isSavedForLater=false] Tranasactions saved for Recall later
   * do not have an TimeEnded marked via endTranasction.
   */
  closePayment(isVoid: boolean = false, isSavedForLater: boolean = false) {
    if (!this.currentTransactionId) {
      return;
    }

    // Add line items
    for (const item of this.items) {
      this._dbService.addTransactionDetail(item, this.currentTransactionId);
    }

    if (!isSavedForLater) {
      this._dbService.endTransaction(this.currentTransactionId, isVoid);
    }

    this.currentTransactionId = null;

    this.cashboxAmount = this._dbService.getCashboxAmount();
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
