import { Component, Input } from '@angular/core';
import { BasePrompt } from '../base-prompt';
import {
  PosService,
  TriggerPromptParams,
} from '../../core/services/pos/pos.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Pass in array of items and how to map each entry to a string
 * inputParams {items: Array<T>, map: (item: T): string => {...}}
 */
@Component({
  selector: 'app-table-prompt',
  imports: [CommonModule, FormsModule],
  templateUrl: './table-prompt.component.html',
  styleUrls: ['./table-prompt.component.scss', '../../shared.scss'],
})
export class TablePromptComponent extends BasePrompt {
  @Input() params!: TriggerPromptParams;
  // data - each subarray in outer array defines a row of a record
  inputParams: { header: Array<string>; data: Array<Array<string>> };

  constructor(private _posService: PosService) {
    super();
    this.inputParams = { header: [], data: [] }; // Until params are set
  }

  protected override onOptionClicked(option: string): void {
    super.onOptionClicked(option);
    this.onDismissClicked();
  }

  protected override onDismissClicked(): void {
    this._posService.promptHandled();
  }
}
