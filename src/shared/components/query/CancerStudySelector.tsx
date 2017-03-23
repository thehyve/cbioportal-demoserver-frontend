import * as _ from "lodash";
import * as React from "react";
import Dictionary = _.Dictionary;
import {TypeOfCancer as CancerType, CancerStudy} from "../../api/generated/CBioPortalAPI";
import {FlexCol, FlexRow} from "../flexbox/FlexBox";
import * as styles_any from './styles.module.scss';
import classNames from 'classnames';
import LabeledCheckbox from "../labeledCheckbox/LabeledCheckbox";
import ReactSelect from 'react-select';
import StudyList from "../StudyList/StudyList";
import {observer} from "mobx-react";
import memoize from "memoize-weak-decorator";
import {QueryStoreComponent} from "./QueryStore";
import SectionHeader from "../sectionHeader/SectionHeader";

const styles = styles_any as {
	CancerStudySelector: string,
	cancerStudySelectorHeader: string,
	selectable: string,
	selected: string,
	selectedCount: string,
	selectAll: string,
	noData: string,
	selectionsExist: string,
	cancerStudyName: string,
	cancerStudySamples: string,
	matchingNodeText: string,
	nonMatchingNodeText: string,
	containsSelectedStudies: string,
	selectCancerStudyHeader: string,
	selectCancerStudyRow: string,
	searchTextInput: string,

	cancerStudySelectorBody: string,
	cancerTypeListContainer: string,
	cancerTypeList: string,
	cancerTypeListItem: string,
	cancerTypeListItemLabel: string,
	cancerTypeListItemCount: string,
	cancerStudyListContainer: string,
};

export type ICancerStudySelectorProps = {
	style?: React.CSSProperties;
};

@observer
export default class CancerStudySelector extends QueryStoreComponent<ICancerStudySelectorProps, void>
{
	constructor(props: ICancerStudySelectorProps)
	{
		super(props);
	}

	@memoize
	getCancerTypeListClickHandler<T>(node:CancerType)
	{
		return (event:React.MouseEvent<T>) => this.store.selectCancerType(node as CancerType, event.ctrlKey);
	}

	handleStudiesCheckbox<T>(event:React.FormEvent<T>, clickedStudyIds:string[])
	{
		if ((event.target as HTMLInputElement).checked)
			this.store.selectedStudyIds = _.union(this.store.selectedStudyIds, clickedStudyIds);
		else
			this.store.selectedStudyIds = _.difference(this.store.selectedStudyIds, clickedStudyIds);
	}

	renderCancerTypeList()
	{
		let logic = this.store.studyListLogic;
		let rootMeta = logic.getMetadata(logic.store.treeData.rootCancerType);
		let listItems = rootMeta && rootMeta.childCancerTypes.map(this.renderCancerTypeListItem);

		return (
			<ul className={styles.cancerTypeList}>
				{listItems}
			</ul>
		);
	}

	renderCancerTypeListItem = (cancerType:CancerType, arrayIndex:number) =>
	{
		let logic = this.store.studyListLogic;
		let numStudies = logic.getDescendantCancerStudies(cancerType).length;

		if (!numStudies)
			return null;

		let selected = _.includes(this.store.selectedCancerTypeIds, cancerType.cancerTypeId);
		let highlighted = this.store.studyListLogic.isHighlighted(cancerType);
		let liClassName = classNames({
			[styles.cancerTypeListItem]: true,
			[styles.selectable]: true,
			[styles.selected]: selected,
			[styles.matchingNodeText]: !!this.store.searchText && highlighted,
			[styles.nonMatchingNodeText]: !!this.store.searchText && !highlighted,
			[styles.containsSelectedStudies]: this.store.studyListLogic.cancerTypeContainsSelectedStudies(cancerType),
		});

		return (
			<li
				key={arrayIndex}
				className={liClassName}
				onMouseDown={this.getCancerTypeListClickHandler(cancerType)}
			>
				<span className={styles.cancerTypeListItemLabel}>
					{cancerType.name}
				</span>
				<span className={styles.cancerTypeListItemCount}>
					{numStudies}
				</span>
			</li>
		);
	}

	renderStudyHeaderCheckbox = (shownStudies:CancerStudy[]) =>
	{
		let selectedStudies = this.store.selectedStudyIds.map(studyId => this.store.treeData.map_studyId_cancerStudy.get(studyId) as CancerStudy);
		let shownAndSelectedStudies = _.intersection(shownStudies, selectedStudies);
		let checked = shownAndSelectedStudies.length > 0;
		let indeterminate = checked && shownAndSelectedStudies.length != shownStudies.length;
		return (
			<LabeledCheckbox
				checked={checked}
				indeterminate={indeterminate}
				labelProps={{
					onClick: (event:React.MouseEvent<HTMLLabelElement>) => event.stopPropagation()
				}}
				onChange={event => {
					let shownStudyIds = shownStudies.map(study => study.studyId);
					this.handleStudiesCheckbox(event, shownStudyIds);
				}}
			/>
		);
	}

	render()
	{
		let searchTextOptions = this.store.searchTextPresets;
		if (this.store.searchText && searchTextOptions.indexOf(this.store.searchText) < 0)
			searchTextOptions = [this.store.searchText].concat(searchTextOptions as string[]);

		let logic = this.store.studyListLogic;
		let selectAllCheckboxProps = logic.getCheckboxProps(logic.rootCancerType);

		let selectedCountClass = classNames({
			[styles.selectedCount]: true,
			[styles.selectionsExist]: this.store.selectedStudyIds.length > 0
		});

		return (
			<FlexCol overflow className={styles.CancerStudySelector}>
				<SectionHeader promises={[this.store.cancerTypes, this.store.cancerStudies]}>
					Select Studies:
					{!!(!this.store.cancerTypes.isPending && !this.store.cancerStudies.isPending) && (
						<span
							className={selectedCountClass}
							onClick={() => {
								if (this.store.selectedStudyIds.length)
									this.store.showSelectedStudiesOnly = !this.store.showSelectedStudiesOnly;
							}}
						>
							<b>{this.store.selectedStudyIds.length}</b> studies selected
							(<b>{this.store.selectedStudies_totalSampleCount}</b> samples)
						</span>
					)}
				</SectionHeader>

				<FlexRow overflow className={styles.cancerStudySelectorHeader}>
					<ReactSelect
						className={styles.searchTextInput}
						value={this.store.searchText}
						autofocus={true}
						options={searchTextOptions.map(str => ({label: str, value: str}))}
						placeholder='Search...'
						noResultsText={false}
						onCloseResetsInput={false}
						onInputChange={(searchText:string) => {
							this.store.searchText = searchText;
							this.store.selectedCancerTypeIds = [];
						}}
						onChange={option => {
							this.store.searchText = option ? option.value || '' : '';
							this.store.selectedCancerTypeIds = [];
						}}
					/>
					{!!(!this.store.forDownloadTab) && (
						<span className={classNames('cta', styles.selectAll)} onClick={() => logic.hack_handleSelectAll(!selectAllCheckboxProps.checked)}>
							{selectAllCheckboxProps.checked ? "Deselect all" : "Select all"}
						</span>
					)}
				</FlexRow>

				<FlexRow className={styles.cancerStudySelectorBody}>
					<div className={styles.cancerTypeListContainer}>
						{this.renderCancerTypeList()}
					</div>
					<div className={styles.cancerStudyListContainer}>
						<StudyList/>
					</div>
				</FlexRow>
			</FlexCol>
		);
	}
}
