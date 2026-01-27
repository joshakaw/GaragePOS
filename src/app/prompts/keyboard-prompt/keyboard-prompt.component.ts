import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import { BasePrompt } from '../base-prompt';
import { CommonModule } from '@angular/common';
import {
  PosService,
  TriggerPromptParams,
} from '../../core/services/pos/pos.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-keyboard-prompt',
  imports: [CommonModule, FormsModule],
  templateUrl: './keyboard-prompt.component.html',
  styleUrls: ['./keyboard-prompt.component.scss', '../../shared.scss'],
})
export class KeyboardPromptComponent
  extends BasePrompt
  implements AfterViewInit
{
  @Input() params!: TriggerPromptParams;
  inputValue: string = '';

  inputParams: { startingInputValue: string; onEnterOption?: string };

  @ViewChild('myInput') inputElement!: ElementRef;

  constructor(private _posService: PosService) {
    super();
    this.inputParams = { startingInputValue: '' };
  }

  ngAfterViewInit(): void {
    this.inputElement.nativeElement.focus();
  }

  protected override onOptionClicked(
    option: string,
    data?: { inputValue: string },
  ): void {
    super.onOptionClicked(option, data);
    this.onDismissClicked();
  }

  public setParams(params: TriggerPromptParams): void {
    super.setParams(params);

    this.inputValue = this.inputParams.startingInputValue ?? '';
  }

  protected override onDismissClicked(): void {
    this._posService.promptHandled();
  }

  protected onEnter() {
    if (!this.inputParams.onEnterOption) return;

    this.onOptionClicked(this.inputParams.onEnterOption, {
      inputValue: this.inputValue,
    });
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
