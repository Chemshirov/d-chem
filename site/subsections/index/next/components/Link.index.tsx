import * as t from '../types/types'
import { Component } from 'react'
import Header from '../components/Header.link.index'
import Info from '../components/Info.link.index'
import Notes from '../components/Notes'
import styles from '../styles/link.index.module.css'

export default class Link extends Component<t.linkIndexProps, t.linkIndexState> {
	constructor(props: t.linkIndexProps) {
		super(props)
		this.state = {
			showMore: false,
		}
	}
	
	private _handleMore(showMore): void {
		this.setState({ showMore })
	}
	
	private _getNotes(): Array<t.note> {
		let notes: Array<t.note> = []
		if (this.props.group && this.props.group.dates) {
			let dates = Object.keys(this.props.group.dates)
			dates.sort().reverse().forEach(date => {
				let noteKey = this.props.group.dates[date]
				if (this.props.notes) {
					let note = this.props.notes[noteKey]
					if (note) {
						notes.push(note)
					}
				}
			})
		}
		return notes
	}
	
	
	render(): JSX.Element {
		return (
			<div className={styles.link} key={this.props.name}>
				<Header
					name={this.props.name}
				/>
				<Notes
					name={this.props.name}
					notes={this._getNotes()}
					showMore={this.state.showMore}
					anotherDomain={this.props.anotherDomain}
					setFullscreen={this.props.setFullscreen}
				/>
				<Info
					text={this.props.group ? this.props.group.text : null}
					showMore={this.state.showMore}
					handleMore={this._handleMore.bind(this)}
				/>
			</div>
		)
	}
}