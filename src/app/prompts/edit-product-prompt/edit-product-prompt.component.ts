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
  selector: 'app-product-tile-prompt',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-product-prompt.component.html',
  styleUrls: ['./edit-product-prompt.component.scss', '../../shared.scss'],
})
export class EditProductPromptComponent extends BasePrompt {
  @Input() params!: TriggerPromptParams;

  constructor(private _posService: PosService) {
    super();
  }

  public setParams(params: TriggerPromptParams): void {
    super.setParams(params);
  }

  protected override onOptionClicked(option: string, data: any): void {
    super.onOptionClicked(option, data);
    this.onDismissClicked();
  }

  protected override onDismissClicked(): void {
    this._posService.promptHandled();
  }
}
