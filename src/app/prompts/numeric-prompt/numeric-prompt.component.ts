import { Component, Input } from '@angular/core';
import { BasePrompt } from '../base-prompt';
import { CommonModule } from '@angular/common';
import {
  PosService,
  TriggerPromptParams,
} from '../../core/services/pos/pos.service';

@Component({
  selector: 'app-numeric-prompt',
  imports: [CommonModule],
  templateUrl: './numeric-prompt.component.html',
  styleUrls: ['./numeric-prompt.component.scss', '../../shared.scss'],
})
export class NumericPromptComponent extends BasePrompt {
  @Input() params!: TriggerPromptParams;
  inputParams: { presets?: Array<string>; defaultOption?: string };
  q1: string = '';
  q2: string = '';
  q3: string = '';
  q4: string = '';

  constructor(private _posService: PosService) {
    super();
    this.inputParams = { presets: [], defaultOption: 'done' };
  }

  protected override onOptionClicked(
    option: string,
    data?: { amount: number; preset?: string },
  ): void {
    super.onOptionClicked(option, data);
    this.onDismissClicked();
  }

  protected override onDismissClicked(): void {
    this._posService.promptHandled();
  }

  public setParams(params: TriggerPromptParams): void {
    super.setParams(params);

    if (!this.inputParams?.presets) {
      return;
    }

    if (this.inputParams.presets.length > 4) {
      throw new Error('Presets can only accept up to four entries');
    }

    this.q1 = this.inputParams.presets[0] ?? '';
    this.q2 = this.inputParams.presets[1] ?? '';
    this.q3 = this.inputParams.presets[2] ?? '';
    this.q4 = this.inputParams.presets[3] ?? '';
  }

  private _centsEntered: number = 0;

  get centsEntered() {
    return (this._centsEntered / 100).toFixed(2);
  }

  /**
   * Numeric value in dollars (not the formatted string).
   * Use this when passing numeric data to callers.
   */
  get amount(): number {
    return this._centsEntered / 100;
  }

  onNumpad(btnLabel: string) {
    if (!btnLabel) {
      return;
    }

    if (btnLabel == '00') {
      this._centsEntered *= 100;
    } else if (btnLabel == 'CLR') {
      this._centsEntered = 0;
    } else {
      let intValue = parseInt(btnLabel);
      this._centsEntered = this._centsEntered * 10 + intValue;
    }
  }

  onPreset(index: number) {
    if (!this.inputParams.defaultOption || !this.inputParams.presets) {
      return;
    }

    this.onOptionClicked(this.inputParams.defaultOption, {
      amount: 0,
      preset: this.inputParams.presets[index],
    });
  }
}
