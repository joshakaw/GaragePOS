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

  changeAmount(): number {
    let item = this.receiptItemList.find(
      (item) => item.productId == ReservedProductId.CashPaymentChange,
    );
    if (item) {
      return item.total;
    } else {
      return 0;
    }
  }

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

  get balanceDue(): number {
    return this._transactionService.totalDue(this.receiptItemList);
  }

  public onClickItem(index: number) {
    this.onClickItemIndex.emit(index);
  }

  private updateHighlightBarPosition() {
    let index = this.selectedItemIndex;

    requestAnimationFrame(() => {
      const rows = document.querySelectorAll(
        '.receipt-table tbody tr',
      ) as NodeListOf<HTMLElement>;
      const rowOffset = index
        ? {
            offsetTop: rows[index].offsetTop,
            offsetHeight: rows[index].offsetHeight,
          }
        : { offsetTop: 0, offsetHeight: 40 };
      const bar = this.highlightBar?.nativeElement as HTMLElement;

      if (bar) {
        const offsetTop = rowOffset.offsetTop + 0; // the plus term must equal the $pad scss variable
        bar.style.top = offsetTop + 'px';
        bar.style.height = rowOffset.offsetHeight + 'px'; // Optional: match dynamic height
      }
    });
  }
}
