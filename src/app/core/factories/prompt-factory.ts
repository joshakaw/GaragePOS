import { Type } from "@angular/core";
import { NumericPromptComponent } from "../../prompts/numeric-prompt/numeric-prompt.component";
import { BasicPromptComponent } from "../../prompts/basic-prompt/basic-prompt.component";
import { ListPromptComponent } from "../../prompts/list-prompt/list-prompt.component";

export class PromptFactory {

    /**
     * Provides the correct Angular component for a given prompt type.
     * @param promptType Type of prompt to return
     * @returns Angular component
     */
    public static createPromptComponent(promptType: string): Type<any> {
        switch(promptType){
            case "numeric":
                return NumericPromptComponent;
            case "basic":
                return BasicPromptComponent;
            case "list":
                return ListPromptComponent;
            default:
                throw new Error("Prompt component not found.");
        }
    }
}
