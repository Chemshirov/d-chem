import * as t from '../types/types'
import { Component } from 'react'
import ServerBlockTitle from './ServerBlockTitle'
import ServerBlockButtons from './ServerBlockButtons'
import ColoredContainer from './ColoredContainer'
import styles from '../styles/serverBlockInfo.module.scss'

class ServerBlockInfo extends Component<t.serverBlockInfoProps> {
	constructor(props: t.serverBlockInfoProps) {
		super(props)
	}
	
	private onClick(): void {
		this.props.onClick(this.props.number)
	}
	
	private _getItem(key: string, bold?: boolean, value?: string | false, isFinal?: boolean): JSX.Element {
		let className = null
		if (bold) {
			className = styles.bold
		}
		if (!value) {
			value = this.props.serverStaticProps[key]
		}
		
		return (
			<>
				<small className={className}>
					{value}
				</small>
				{this._getComma(isFinal)}
			</>
		)
	}
	
	private _getComma(isFinal: boolean): JSX.Element | null {
		if (!isFinal) {
			return (
				<small>
					{', '}
				</small>
			)
		} else {
			return null
		}
	}
	
	private _getButtons(showButtons: boolean): JSX.Element | null {
		if (showButtons) {
			return (
				<ServerBlockButtons
					serverStaticProps={this.props.serverStaticProps}
					role={this.props.role}
					containers={this.props.containers}
					isAdmin={this.props.isAdmin}
					loginMenuOpener={this.props.loginMenuOpener}
					emit={this.props.emit}
					buttonsState={this.props.buttonsState}
				/>
			)
		} else {
			return null
		}
	}
	
	render(): JSX.Element {
		let mainClassName = styles.main + ' hiddenLink '
			mainClassName += 'serverInfoH-' + this.props.number + ' '
		if (!this.props.chosenServerBlock) {
			mainClassName += 'serverInfoV2-' + this.props.number + ' '
		} else {
			if (this.props.number === this.props.chosenServerBlock) {
				mainClassName += 'serverInfoVC-' + this.props.number + ' '
			} else {
				if (this.props.number < this.props.chosenServerBlock) {
					mainClassName += 'serverInfoVB-' + this.props.number + ' '
				} else {
					mainClassName += 'serverInfoVE-' + this.props.number + ' '
				}
			}
		}
		let isCurrentBlock = (this.props.number === this.props.serverBlockNumber)
		if (isCurrentBlock) {
			mainClassName += styles.current
		}
		let showButtons = (isCurrentBlock && this.props.number === this.props.chosenServerBlock)
		let role: JSX.Element | null = null
		if (this.props.role) {
			role = this._getItem('isMaster', true, this.props.role, true)
		}
		
		return (
			<div
				className={mainClassName}
			>
				{this._getButtons(showButtons)}
				<div
					onClick={this.onClick.bind(this)}
				>
					<div>
						{this._getItem('domain', true)}
						{this._getItem('ip')}
						{this._getItem('stage', false, false, !role)}
						{role}
					</div>
					<Containers
						containers={this.props.containers}
						serverStaticProps={this.props.serverStaticProps}
						currentStatistics={this.props.currentStatistics}
					/>
					<ShortLog
						log={this.props.shortLog}
					/>
				</div>
			</div>
		)
	}
}

interface containersProps {
	containers: t.serverBlockInfoProps['containers'],
	serverStaticProps: t.serverBlockInfoProps['serverStaticProps'],
	currentStatistics: t.serverBlockInfoProps['currentStatistics'],
}
class Containers extends Component<containersProps> {
	constructor(props: containersProps) {
		super(props)
	}
	
	private _getJSX(): Array<JSX.Element> {
		let jsx = []
		if (this.props.containers) {
			this.props.containers.forEach((hostname, i) => {
				let name = this.props.serverStaticProps.Containers[hostname].name
				let statisticsArray = this.props.currentStatistics[hostname]
				jsx.push(
					<span key={hostname}>
						<ColoredContainer
							name={name}
							hostname={hostname}
							statisticsArray={statisticsArray}
							current={false}
							small={true}
						/>
						{this._getComma(this.props.containers.length !== i + 1)}
					</span>
				)
			})
		}
		return jsx
	}
	
	private _getComma(show: boolean): JSX.Element | null {
		if (show) {
			return (
				<small>
					{', '}
				</small>
			)
		} else {
			return null
		}
	}
	
	render(): JSX.Element {
		return (
			<div className={styles.containers}>
				{this._getJSX()}
			</div>
		)
	}
}

interface shortLogProps {
	log: t.serverBlockInfoProps['shortLog'],
}
class ShortLog extends Component<shortLogProps> {
	constructor(props: shortLogProps) {
		super(props)
	}
	
	private _getDateJSX(date: string, nextMinuteDate: string): JSX.Element {
		let currentMinuteDate = date.substring(0, 16)
		if (currentMinuteDate !== nextMinuteDate) {
			return (
				<small className={styles.date + ' ' + styles.day}>
					<small className={styles.paddingR}>
						{date.substring(8, 10)}
					</small>
					<small>
						{date.substring(11, 16)}
					</small>
				</small>
			)
		} else {
			return (
				<small className={styles.date}>
					<small className={styles.day}>
						{date.substring(14, 17)}
					</small>
					<small className={styles.second}>
						{date.substring(17, 21)}
					</small>
				</small>
			)
		}
	}
	
	private _getJSX(log: shortLogProps['log']): Array<JSX.Element> {
		let jsx = []
		let nextMinuteDate = ''
		if (log) {
			log.forEach((line, i) => {
				if (log[i + 1]) {
					nextMinuteDate = log[i + 1].date.substring(0, 16)
				}
				let { date, type, value } = line
				let className = styles.data
				if (type === 'errors') {
					className = styles.errors
				}
				let title = ''
				let text = ''
				try {
					let object = JSON.parse(value)
					if (object) {
						title = object.className
						if (typeof object.data === 'string') {
							text = object.data
						} else if (typeof object.data === 'number') {
							text = object.data
						} else if (typeof object.data === 'object') {
							text = JSON.stringify(object.data)
						} else {
							if (typeof object.error === 'object') {
								text = JSON.stringify(object.error)
							} else if (typeof object.error === 'string') {
								text = object.error
							}
						}
					}
				} catch (e) {}
				if (text) {
					jsx.push(
						<div
							className={styles.line}
							key={date}
						>
							{this._getDateJSX(date, nextMinuteDate)}
							<small className={styles.label}>
								{title}
							</small>
							<small className={className}>
								{text}
							</small>
						</div>
					)
				}
			})
		}
		return jsx
	}
	
	
	render(): JSX.Element {
		return (
			<div className={styles.log}>
				{this._getJSX(this.props.log)}
			</div>
		)
	}
}

export default ServerBlockInfo