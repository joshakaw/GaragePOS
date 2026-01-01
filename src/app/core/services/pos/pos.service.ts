import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { DbProduct } from '../../../models/db/product';

/**
 * Service that handles application-wide Point of Sale (POS) operations,
 * not just limited to the main POS UI.
 */
@Injectable({
  providedIn: 'root',
})
export class PosService {
  private promptSubject = new Subject<TriggerPromptParams | null>();
  /**
   * Triggers either:
   *  1. When a new prompt is requested, with none pending in queue
   *  2. When the previous prompt is closed. In this case, it will
   *     either be null (no more remaining) or another prompt.
   *
   *  TODO: Convert to method onPrompt
   */
  public prompt$ = this.promptSubject.asObservable();

  private promptQueue: Array<TriggerPromptParams> = [];
  private promptProcessing: boolean = false;

  private addProductToTransactionSubject = new Subject<DbProduct>();

  constructor() {}

  // Transaction //

  addItem(product: DbProduct) {
    this.addProductToTransactionSubject.next(product);
  }

  onItemAdded(): Observable<DbProduct> {
    return this.addProductToTransactionSubject.asObservable();
  }

  // Prompt //

  /**
   * Puts a prompt in the queue to be displayed.
   *
   * Note: `promptHandled()` must be called after each
   * prompt is handled to advance it in the queue.
   */
  triggerPrompt(params: TriggerPromptParams) {
    params.dismissable = params.dismissable ?? true;

    this.promptQueue.push(params);
    this.processPromptIfReady();
  }

  /** Processes next prompt in queue, if ready. */
  private processPromptIfReady() {
    if (this.promptProcessing == true) return;
    if (this.promptQueue.length == 0) {
      this.promptSubject.next(null);
      return;
    }

    this.promptProcessing = true;
    this.promptSubject.next(this.promptQueue[0]);
  }

  /**
   * Signals that another prompt can now be served.
   */
  public promptHandled() {
    this.promptProcessing = false;
    this.promptQueue.shift();

    this.processPromptIfReady();
  }
}

export interface TriggerPromptParams {
  /**
   * Type of prompt window.
   *
   * Basic - Title, description, options.
   * Currency - T,D,O + Currency input
   * Numeric - T,D,O + Number input
   * Text - T,D,O + Text input
   */
  type: 'basic' | 'currency' | 'numeric' | 'text' | 'list';

  /** Prompt title */
  title: string;

  /** Description */
  description: string;

  /**
   * Option buttons. Name will be
   * returned in callback on click.
   */
  options: Array<string>;

  /**
   * Custom input parameters (i.e. selection list items)
   */
  inputParams?: any;

  /**
   * Callback for option selection
   * @param option Option string selected
   * @param data Any custom data returned by the prompt
   * @returns
   */
  onOptionClick: (option: string, data: any) => void;

  /**
   * Allows user to dismiss
   * prompt and return.
   * Default true.
   */
  dismissable: boolean;
}
