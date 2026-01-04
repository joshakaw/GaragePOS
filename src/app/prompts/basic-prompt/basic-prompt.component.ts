import { Component, Input } from '@angular/core';
import { BasePrompt } from '../base-prompt';
import { PosService, TriggerPromptParams } from '../../core/services/pos/pos.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-basic-prompt',
  imports: [CommonModule],
  templateUrl: './basic-prompt.component.html',
  styleUrls: ['./basic-prompt.component.scss', '../../shared.scss']
})
export class BasicPromptComponent extends BasePrompt {

  @Input() params! : TriggerPromptParams;

  constructor(
    private _posService: PosService
  ){
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

  protected override onOptionClicked(option: string, data?: any): void {
      super.onOptionClicked(option, data);
      this.onDismissClicked();
  }

  protected override onDismissClicked(): void {
      this._posService.promptHandled();
  }
}
