import * as t from '../types/types'
import { Component } from 'react'
import Link from '../components/Link.index'
import styles from '../styles/main.index.module.css'

export default class Main extends Component<t.mainIndexProps> {
	constructor(props: t.mainIndexProps) {
		super(props)
	}
	
	private _getContacts(): Array<JSX.Element> {
		let jsx = []
		if (this.props.data && this.props.data.contacts) {
			Object.keys(this.props.data.contacts).forEach(key => {
				let value = this.props.data.contacts[key]
				jsx.push(
					<tr key={key}>
						<td>
							{key}
						</td>
						<td>
							{value}
						</td>
					</tr>
				)
			})
		}
		return jsx
	}
	
	private _getLinks(): Array<JSX.Element> {
		let jsx = []
		if (this.props.data && this.props.data.subsections) {
			this.props.data.subsections.forEach(subsection => {
				jsx.push(
					<Link
						key={subsection}
						name={subsection}
						group={this.props.data.data.groups[subsection]}
						notes={this.props.data.data.notes}
						anotherDomain={this.props.data.anotherDomain}
						setFullscreen={this.props.setFullscreen}
					/>
				)
			})
		}
		return jsx
	}
	
	render(): JSX.Element {
		return (
			<div className={styles.main}>
				<div className={styles.sections}>
					<div className={styles.sectionsNames}>
						Links
					</div>
					<div className={styles.links}>
						{this._getLinks()}
					</div>
				</div>
				<div className={styles.sections}>
					<div className={styles.sectionsNames}>
						Contacts
					</div>
					<div>
						<table className={styles.table}>
							<tbody>
								{this._getContacts()}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		)
	}
}