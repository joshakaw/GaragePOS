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
  selector: 'app-list-prompt',
  imports: [CommonModule, FormsModule],
  templateUrl: './list-prompt.component.html',
  styleUrls: ['./list-prompt.component.scss', '../../shared.scss'],
})
export class ListPromptComponent extends BasePrompt {
  @Input() params!: TriggerPromptParams;
  inputParams: { items: Array<any>; map: (item: any) => string };

  selection: any | undefined;

  constructor(private _posService: PosService) {
    super();
    this.inputParams = { items: [], map: (item) => 'N/A' }; // Until params are set

    // const testParams: TriggerPromptParams = {
    //   title: "My Title",
    //   description:"My Description",
    //   dismissable: false,
    //   type: "basic",
    //   options: ["A", "B"],
    //   onOptionClick: function(option){}
    // }

    // this.setParams(testParams);
  }

  public setParams(params: TriggerPromptParams): void {
    super.setParams(params);
    
    if (this.inputParams.items.length == 0) {
      throw new Error('List prompt was supplied with no items.');
    }
    this.selection = this.inputParams.items[0];
  }

  protected override onOptionClicked(option: string): void {
    let data = {
      listItemSelection: this.inputParams.map(this.selection),
      itemSelection: this.selection,
    };

    super.onOptionClicked(option, data);
    this.onDismissClicked();
  }

  protected override onDismissClicked(): void {
    this._posService.promptHandled();
  }
}
