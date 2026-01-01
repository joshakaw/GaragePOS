import {
  Component,
  computed,
  ElementRef,
  EventEmitter,
  Input,
  input,
  OnChanges,
  Output,
  Signal,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { ReceiptItem } from '../models/receipt-item.model';
import { CommonModule, NgFor } from '@angular/common';
import { TransactionService } from '../core/services/transaction/transaction.service';
import { ReservedProductId } from '../models/db/product';

@Component({
  selector: 'app-receipt',
  imports: [CommonModule],
  templateUrl: './receipt.component.html',
  styleUrl: './receipt.component.scss',
  standalone: true,
})
export class ReceiptComponent implements OnChanges {
  @Input({ required: true }) receiptItemList!: Array<ReceiptItem>;
  @Input({ required: true }) selectedItemIndex!: number | null;

  /** The transaction number to display with the receipt */
  @Input() transactionReferenceNumber!: number | null;
  @Output() onClickItemIndex = new EventEmitter<number>();
  @ViewChild('highlightBar') highlightBar!: ElementRef;

  changeAmount() : string | null{
    let item = this.receiptItemList.find(
      (item) => item.productId == ReservedProductId.CashPaymentChange
    );
    if (item) {
      return item.displayTotal;
    } else {
      return null;
    }
  };

  constructor(private _transactionService: TransactionService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedItemIndex'] || changes['receiptItemList']) {
      this.updateHighlightBarPosition();
    }
  }

  /**
   * Gets total before tax.
   * (Tax is not collected in garage sales, so we don't implement that)
   */
  get subtotal(): number {
    return this._transactionService.subtotal(this.receiptItemList);
  }

  get displaySubtotal() : string {
    return "$" + this.subtotal.toFixed(2);
  }

  public onClickItem(index: number) {
    this.onClickItemIndex.emit(index);
  }

  private updateHighlightBarPosition() {
    let index = this.selectedItemIndex;
    if (index == null) {
      return;
    }

    requestAnimationFrame(() => {
      const rows = document.querySelectorAll('.receipt-table tbody tr');
      const row = rows[index] as HTMLElement;
      const bar = this.highlightBar?.nativeElement as HTMLElement;

      if (row && bar) {
        const offsetTop = row.offsetTop + 20;
        bar.style.top = offsetTop + 'px';
        bar.style.height = row.offsetHeight + 'px'; // Optional: match dynamic height
      }
    });
  }
}
