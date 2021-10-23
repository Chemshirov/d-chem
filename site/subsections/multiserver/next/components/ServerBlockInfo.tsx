import { Component } from 'react'
import ServerBlockTitle from './ServerBlockTitle'
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
	
	_getItem(key, bold) {
		let className = null
		if (bold) {
			className = styles.bold
		}
		
		return (
			<>
				<small className={className}>
					{this.props.serverStaticProps[key]}
				</small>
				<small>{', '}</small>
			</>
		)
	}
	
	render() {
		let isCurrentBlock = (this.props.number === this.props.serverBlockNumber)
		if (!isCurrentBlock) {
			let gridColumnNumber = this.props.number * 2
			let gridColumn = gridColumnNumber + ' / ' + gridColumnNumber
			let mainClassName = styles.main + ' mbg hiddenLink ' + styles.notCurrent
			return (
				<div
					className={mainClassName}
					style={{ gridColumn }}
					onClick={this.onClick.bind(this)}
				>
					{this._getItem('domain', true)}
					{this._getItem('ip')}
					{this._getItem('stage', true)}
					<Containers
						containers={this.props.serverStaticProps.Containers}
						currentStatistics={this.props.currentStatistics}
					/>
					<ShortLog
						log={this.props.shortLog}
					/>
				</div>
			)
		} else {
			return null
		}
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
			let containersArray = Object.keys(this.props.containers)
			containersArray.sort().forEach((hostname, i) => {
				let name = this.props.containers[hostname].name
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
						{this._getComma(containersArray.length !== i + 1)}
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
				<small className={styles.day}>
					<small>
						{date.substring(8, 10)}
					</small>
					<small className={styles.paddingH}>
						{date.substring(11, 16)}
					</small>
				</small>
			)
		} else {
			return (
				<small className={styles.paddingH}>
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
			// console.log(date, nextMinuteDate)
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