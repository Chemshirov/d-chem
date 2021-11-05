import { Component } from 'react'
import ServerBlockTitle from './ServerBlockTitle'
import ServerBlockButtons from './ServerBlockButtons'
import ColoredContainer from './ColoredContainer'
import styles from '../styles/serverBlockInfo.module.scss'
import { staticObjectDomain, containers } from '../../../../../../../currentPath/DataHandler'

interface props {
	number: number,
	serverBlockNumber: number,
	serverStaticProps: staticObjectDomain,
	onClick: ((number: number) => void)
}
class ServerBlockInfo extends Component<props> {
	constructor(props: props) {
		super(props)
	}
	
	onClick() {
		this.props.onClick(this.props.number)
	}
	
	_getItem(key, bold, value, isFinal) {
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
	
	_getComma(isFinal) {
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
	
	_getButtons(showButtons) {
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
	
	render() {
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
						{this._getItem('stage')}
						{this._getItem('isMaster', true, this.props.role, true)}
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

interface containersState {
	containers: containers,
}
class Containers extends Component<containersState> {
	constructor(props: containersState) {
		super(props)
	}
	
	_getJSX() {
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
	
	_getComma(show: boolean) {
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
	
	render() {
		return (
			<div className={styles.containers}>
				{this._getJSX()}
			</div>
		)
	}
}

class ShortLog extends Component {
	constructor(props) {
		super(props)
	}
	
	_getDateJSX(date, nextMinuteDate) {
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
	
	_getJSX(log) {
		let jsx = []
		let nextMinuteDate = false
		log.forEach((line, i) => {
			if (log[i + 1]) {
				nextMinuteDate = log[i + 1].date.substring(0, 16)
			}
			let { date, type, value } = line
			let className = styles.data
			if (type === 'errors') {
				className = styles.errors
			}
			let object = JSON.parse(value)
			let data = ''
			if (typeof object.data === 'string') {
				data = object.data
			} else if (typeof object.data === 'object') {
				data = JSON.stringify(object.data)
			} else {
				data = JSON.stringify(object.error)
			}
			jsx.push(
				<div
					className={styles.line}
					key={date}
				>
					{this._getDateJSX(date, nextMinuteDate)}
					<small className={styles.label}>
						{object.className}
					</small>
					<small className={className}>
						{data}
					</small>
				</div>
			)
		})
		return jsx
	}
	
	
	render() {
		return (
			<div className={styles.log}>
				{this._getJSX(this.props.log)}
			</div>
		)
	}
}

export default ServerBlockInfo