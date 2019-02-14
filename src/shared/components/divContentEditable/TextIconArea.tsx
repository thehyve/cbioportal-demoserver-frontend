import * as React from 'react';
import { observer } from 'mobx-react';
import classNames from 'classnames';
import _ from 'lodash';
import ReactDOM from 'react-dom';
import { observable } from 'mobx';

export interface ITextIconAreaProps {
    elements: ITextIconAreaItemProps[];
    text:string;
    placeholder?: string;
    classNames?: string[];
    onItemRemove?: (d:string) => void;
    onChange?: (d:string[], s:string) => string;
}

export interface ITextIconAreaItemProps {
    label: string;
    value: string;
    classNames?: string[];
}

@observer
class TextIconArea extends React.Component<ITextIconAreaProps, {text:string}> {

    // I was unable to make the textare listen to updates of this field
    // from the parent with MobX. Instead, the parent callback 'onChang'
    // returns a string that is used to update the textarea.
    @observable textAreaContent:string = "";

    constructor(props:ITextIconAreaProps) {
        super(props);
        this.textUpdatedByUser = this.textUpdatedByUser.bind(this); 
        this.itemRemovedByUser = this.itemRemovedByUser.bind(this);
    }

    private itemRemovedByUser = (event:any) => {
        if (this.props.onItemRemove && event.target) {
            this.props.onItemRemove(event.target.id);
        }
    }
    
    private textUpdatedByUser = (event:any) => {
        let text:string = event.currentTarget.value;
        if (this.props.onChange) {
            const insertedChar:string = event.nativeEvent.data;
            // only update the parent when a field separator or EOL (null) was typed.
            const fieldSepDetected:boolean = event.type === "change" && (insertedChar === null || insertedChar.search(/[\s,]/) >= 0);
             if (fieldSepDetected) {
                text = this.props.onChange(this.splitTextField(text), text);
            }
        }
        this.textAreaContent = text;
    }

    private onAreaClicked = (event:any) => {
        const textArea:HTMLElement = ReactDOM.findDOMNode(this.refs.textarea);
        textArea.focus();
    }

    private splitTextField(text:string):string[] {
        return _.uniq(text.split(/[\s\n]/));
    }

    render() {
        return (
            <div className={classNames("text-icon-area",this.props.classNames)}
                onClick={this.onAreaClicked}>
                <div className={classNames("icon-area",this.props.classNames)}>
                    {this.props.elements.map((element:ITextIconAreaItemProps) => {
                        return (
                            <div className={classNames(element.classNames, "icon")}>
                                {element.label}
                                &nbsp;
                                <div 
                                    className={classNames("fa", "fa-times-circle", "icon-button")}
                                    onClick={this.itemRemovedByUser}
                                    id={element.value}
                                />
                            </div>
                        )
                    })}
                </div>
                <textarea
                    ref={"textarea"}
                    placeholder={this.props.placeholder}
                    value={this.textAreaContent}
                    onChange={this.textUpdatedByUser}
                    className={classNames("text-area",this.props.classNames)}
                ></textarea>
            </div>
        )
    }
}

export default TextIconArea;