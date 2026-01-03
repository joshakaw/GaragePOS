import { Type } from '@angular/core';
import { NumericPromptComponent } from '../../prompts/numeric-prompt/numeric-prompt.component';
import { BasicPromptComponent } from '../../prompts/basic-prompt/basic-prompt.component';
import { ListPromptComponent } from '../../prompts/list-prompt/list-prompt.component';
import { KeyboardPromptComponent } from '../../prompts/keyboard-prompt/keyboard-prompt.component';
import { EditTilePromptComponent } from '../../prompts/edit-tile-prompt/edit-tile-prompt.component';

/**
 * Type of prompt window.
 *
 * Basic - Title, description, options.
 * Currency - T,D,O + Currency input
 * Numeric - T,D,O + Number input
 * Keyboard - T,D,O + Text input
 * Edit Tile - Custom
 */
export type PromptTypeOptions = 'basic' | 'numeric' | 'list' | 'keyboard' | 'edit-tile';

export class PromptFactory {
  /**
   * Provides the correct Angular component for a given prompt type.
   * @param promptType Type of prompt to return
   * @returns Angular component
   */
  public static createPromptComponent(promptType: string): Type<any> {
    switch (promptType) {
      case 'basic':
        return BasicPromptComponent;
      case 'numeric':
        return NumericPromptComponent;
      case 'list':
        return ListPromptComponent;
      case 'keyboard':
        return KeyboardPromptComponent;
      case 'edit-tile':
        return EditTilePromptComponent;
      default:
        throw new Error('Prompt component not found.');
    }
  }
}
