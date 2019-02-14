import * as React from 'react';
import { observer } from 'mobx-react';
import classNames from 'classnames';
import ContentEditable from 'react-contenteditable'
import _ from 'lodash';
import ReactDOM from 'react-dom';

export interface ITextIconAreaProps {
    elements: ITextIconAreaItemProps[];
    text:string;
    placeholder?: string;
    classNames?: string[];
    onItemRemove?: (d:string) => void;
    onChange?: (d:string[], s:string) => void;
}

export interface ITextIconAreaItemProps {
    label: string;
    value: string;
    classNames?: string[];
}

@observer
class TextIconArea extends React.Component<ITextIconAreaProps, {}> {

    textArea:any;

    constructor(props:ITextIconAreaProps) {
        super(props);
        this.divUpdatedByUser = this.divUpdatedByUser.bind(this); 
        this.itemRemovedByUser = this.itemRemovedByUser.bind(this);
    }

    private itemRemovedByUser = (event:any) => {
        if (this.props.onItemRemove && event.target) {
            this.props.onItemRemove(event.target.id);
        }
    }
    
    private divUpdatedByUser = (event:any) => {
        if (this.props.onChange) {
            const insertedChar:string = event.nativeEvent.data;
            // only update the parent when a field separator or EOL (null) was typed.
            const fieldSepDetected:boolean = insertedChar !== undefined && (insertedChar === null || insertedChar.search(/[\s,]/) >= 0);
            if (fieldSepDetected) {
                const text:string = event.currentTarget.innerText;
                const elements = this.splitTextField(text);
                this.props.onChange(this.splitTextField(text), text);
            }
        }
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
                {/* react-contenteditable depedency handles logic like eventhandling
                cursor management, and -html styling of text*/}
                <ContentEditable
                    ref={"textarea"}
                    data-ph={this.props.placeholder}
                    html={this.props.text}
                    disabled={false}
                    onChange={this.divUpdatedByUser}
                    className={classNames("text-area",this.props.classNames)}
                >
                </ContentEditable>
            </div>
        )
    }
}

export default TextIconArea;