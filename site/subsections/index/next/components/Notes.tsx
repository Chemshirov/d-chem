import * as t from '../types/types'
import { Component } from 'react'
import Note from '../components/Note'
import styles from '../styles/notes.module.css'

export default class Notes extends Component<t.notesProps> {
	constructor(props: t.notesProps) {
		super(props)
	}
	
	private _getNotes(): Array<JSX.Element> {
		let jsx = []
		if (this.props.notes) {
			this.props.notes.forEach(note => {
				jsx.push(
					<Note
						key={note.date}
						note={note}
						anotherDomain={this.props.anotherDomain}
						setFullscreen={this.props.setFullscreen}
					/>
				)
			})
		}
		return jsx
	}
	
	render(): JSX.Element {
		let listClassName = styles.list
		if (this.props.showMore) {
			listClassName += ' ' + styles.listMore
		} else {
			listClassName += ' ' + styles.listLess
		}
		return (
			<div className={listClassName}>
				{this._getNotes()}
			</div>
		)
	}
}