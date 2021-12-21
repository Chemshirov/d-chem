import * as t from '../types/types'
import { Component } from 'react'
import styles from '../styles/info.link.index.module.css'

export default class Info extends Component<t.infoLinkIndexProps> {
	constructor(props: t.infoLinkIndexProps) {
		super(props)
	}
	
	private _getMoreButton(): JSX.Element | null {
		if (this.props.text && !this.props.showMore) {
			return (
				<button
					type="button"
					className={styles.button + ' ' + styles.more}
					onClick={this._onMoreClick.bind(this)}
				/>
			)
		} else {
			return null
		}
	}
	
	private _onMoreClick(): void {
		this.props.handleMore(true)
	}
	
	private _onLessClick(): void {
		this.props.handleMore(false)
	}
	
	private _getText(): Array<JSX.Element> {
		let jsx = []
		jsx.push(
			<span key="span">
				{this.props.text}
			</span>
		)
		if (this.props.showMore) {
			jsx.push(
				<button
					key="button"
					type="button"
					className={styles.button + ' ' + styles.less}
					onClick={this._onLessClick.bind(this)}
				/>
			)
		}
		return jsx
	}
	
	render(): JSX.Element {
		let moreLessClass = styles.lessText
		if (this.props.showMore) {
			moreLessClass = styles.moreText
		}
		return (
			<div className={styles.block}>
				<div className={moreLessClass}>
					{this._getText()}
				</div>
				{this._getMoreButton()}
			</div>
		)
	}
}