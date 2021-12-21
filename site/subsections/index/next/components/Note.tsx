import * as t from '../types/types'
import { Component } from 'react'
import styles from '../styles/note.module.css'

export default class Note extends Component<t.noteProps> {
	constructor(props: t.noteProps) {
		super(props)
	}
	
	private _getShortDate(): string {
		return (this.props.note.date + '').substring(0, 16)
	}
	
	private _showNote(): void {
		this.props.setFullscreen({
			note: this.props.note,
			anotherDomain: this.props.anotherDomain,
		})
	}
	
	render(): JSX.Element {
		let url = this.props.note.miniName
		let backgroundImage = 'url(' + url + ')'
		if (this.props.anotherDomain) {
			backgroundImage = 'url("https://' + this.props.anotherDomain + url + '"), url("' + url + '")'
		}
		let style = { backgroundImage }
		return (
			<div
				className={styles.mini}
				onClick={this._showNote.bind(this)}
			>
				<div
					className={styles.image}
					style={{ backgroundImage }}
				/>
				<div className={styles.info}>
					<div className={styles.date}>
						<small>
							{this._getShortDate()}
						</small>
					</div>
					<div className={styles.title}>
						<small>
							{this.props.note.title}
						</small>
					</div>
				</div>
			</div>
		)
	}
}