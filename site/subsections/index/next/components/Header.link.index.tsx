import * as t from '../types/types'
import { Component } from 'react'
import styles from '../styles/header.link.index.module.css'

export default class Header extends Component<t.headerLinkIndexProps> {
	constructor(props: t.headerLinkIndexProps) {
		super(props)
	}
	
	private _getName(): JSX.Element {
		if (this.props.name.startsWith('/')) {
			return (
				<a
					href={this.props.name}
					target="_blank"
					rel="noreferrer noopener"
				>
					{this.props.name}
				</a>
			)
		} else {
			return (
				<span>
					{this.props.name}
				</span>
			)
		}
	}
	
	render(): JSX.Element {
		return (
			<div className={styles.line}>
				<h3 className={styles.name}>
					{this._getName()}
				</h3>
			</div>
		)
	}
}