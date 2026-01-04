import { Component, Input } from '@angular/core';
import { BasePrompt } from '../base-prompt';
import {
  PosService,
  TriggerPromptParams,
} from '../../core/services/pos/pos.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-list-prompt',
  imports: [CommonModule, FormsModule],
  templateUrl: './list-prompt.component.html',
  styleUrls: ['./list-prompt.component.scss', '../../shared.scss'],
})
export class ListPromptComponent extends BasePrompt {
  @Input() params!: TriggerPromptParams;

  selection: string | undefined;

  constructor(private _posService: PosService) {
    super();

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

  protected override onOptionClicked(option: string): void {
    let data = { listItemSelection: this.selection };

    super.onOptionClicked(option, data);
    this.onDismissClicked();
  }

  protected override onDismissClicked(): void {
    this._posService.promptHandled();
  }
}
