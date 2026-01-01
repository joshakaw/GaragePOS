import { TriggerPromptParams } from "../core/services/pos/pos.service"

export class BasePrompt {

    title!: string;
    description!: string;
    dismissable!: boolean;
    options!: string[];
    optionCallback!: (option: string, data?: any) => void;

    public setParams(params: TriggerPromptParams){
        this.title = params.title;
        this.description = params.description;
        this.dismissable = params.dismissable;
        this.options = params.options;
        this.optionCallback = params.onOptionClick;
    }

    /**
     * Called when user selects an option
     * button on the prompt
     * @param option Option text selected
     */
    protected onOptionClicked(option: string, data?: any){
        console.log(`Prompt option '${option}' clicked.`)
        this.optionCallback(option, data);
    }

    /**
     * Called when user dismisses the prompt.
     */
    protected onDismissClicked(){
        console.log("Prompt option cancelled.")
        
    }

}
