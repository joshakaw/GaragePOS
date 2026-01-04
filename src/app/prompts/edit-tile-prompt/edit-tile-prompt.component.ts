import { Component, Input } from '@angular/core';
import { BasePrompt } from '../base-prompt';
import {
  PosService,
  TriggerPromptParams,
} from '../../core/services/pos/pos.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DbGridMenuButton } from '../../models/db/product';

@Component({
  selector: 'app-edit-tile-prompt',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-tile-prompt.component.html',
  styleUrls: ['./edit-tile-prompt.component.scss', '../../shared.scss'],
})
export class EditTilePromptComponent extends BasePrompt {
  @Input() params!: TriggerPromptParams;
  protected label: string = '<BLANK>';

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

  public setParams(params: TriggerPromptParams): void {
    super.setParams(params);

    let btn: DbGridMenuButton = this.inputParams.gridMenuButton;
    this.label = btn.Label ?? '<BLANK>';
  }

  protected override onOptionClicked(option: string, data: {newLabel: string}): void {
    super.onOptionClicked(option, data);
    this.onDismissClicked();
  }

  protected override onDismissClicked(): void {
    this._posService.promptHandled();
  }
}
