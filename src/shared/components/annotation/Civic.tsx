import * as React from 'react';
import {Modal} from 'react-bootstrap';
import {observer} from "mobx-react";
import {Circle} from "better-react-spinkit";
import DefaultTooltip from 'shared/components/DefaultTooltip';
import annotationStyles from "./styles/annotation.module.scss";
import {ICivicVariant, ICivicInstance} from "shared/model/Civic.ts";
import {observable} from "mobx";
import CivicCard from "./CivicCard";

export interface ICivicProps { 
    civicInstance: ICivicInstance | null | undefined;
    isCivicDisabled: boolean;
}

export function hideArrow(tooltipEl: any) {
    const arrowEl = tooltipEl.querySelector('.rc-tooltip-arrow');
    arrowEl.style.display = 'none';
}

@observer
export default class Civic extends React.Component<ICivicProps, {}>
{
    @observable tooltipDataLoadComplete:boolean = false;
    
    public static sortValue(civicInstance:ICivicInstance | null | undefined): number
    {
        let score: number = 0;

        if (civicInstance && civicInstance != null) {
            score = 1;
        }

        return score;
    }

    constructor(props: ICivicProps)
    {
        super(props);

        this.cardContent = this.cardContent.bind(this);
    }

    public render()
    {
        let civicContent:JSX.Element = (
            <span className={`${annotationStyles["annotation-item"]}`} />
        );
        
        const civicImgWidth:number = 14;
        let civicImgHeight:number = 14;
        let civicImgSrc = require("./images/civic-logo.png");
        if (this.props.isCivicDisabled)
        {
            civicImgSrc = require("./images/civic-logo-disabled.png");
        }

        if (this.props.civicInstance !== undefined)
        {
            if (this.props.civicInstance !== null)
            {
                civicContent = (
                    <span className={`${annotationStyles["annotation-item"]}`}>
                            <img
                                width={civicImgWidth}
                                height={civicImgHeight}
                                src={civicImgSrc}
                                alt='Civic Variant Entry'
                            />
                        </span>
                );
    
                const arrowContent = <div className="rc-tooltip-arrow-inner"/>;

                civicContent = (
                    <DefaultTooltip
                        overlay={this.cardContent.bind(this, this.props.civicInstance)}
                        placement="right"
                        trigger={['hover', 'focus']}
                        arrowContent={arrowContent}
                        onPopupAlign={hideArrow}
                        destroyTooltipOnHide={false}
                    >
                        {civicContent}
                    </DefaultTooltip>
                );
            }
        }
        else
        {
            // It's still unknown (undefined) if the current gene hasCivicData or not.
            civicContent = this.loaderIcon();
        }

        return civicContent;
    }

    public loaderIcon()
    {
        return (
            <Circle size={18} scaleEnd={0.5} scaleStart={0.2} color="#aaa" className="pull-left"/>
        );
    }

    private cardContent(civicInstance: ICivicInstance): JSX.Element
    {
        return (
            <CivicCard
                    title={`CIViC Variants`}
                    geneName={civicInstance.name}
                    geneDescription={civicInstance.description}
                    geneUrl={civicInstance.url}
                    variants={civicInstance.variants}
                />
        );
    }
}