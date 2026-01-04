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

  constructor(private _posService: PosService) {
    super();
  }

  protected override onOptionClicked(option: string, data?: {amount: number}): void {
    super.onOptionClicked(option, data);
    this.onDismissClicked();
  }

  protected override onDismissClicked(): void {
    this._posService.promptHandled();
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
}
