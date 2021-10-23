import CloseButton from './CloseButton'
import { Component, createRef } from 'react'
import styles from '../styles/serverBlockTitle.module.scss'
import { staticObjectDomain, containers } from '../../../../../../../currentPath/DataHandler'

interface props {
	serverBlockNumber: number,
	serverStaticProps: staticObjectDomain
}
class ServerBlockTitle extends Component<props> {
	constructor(props: props) {
		super(props)
		let timeDifference = this._getTimeDifference()
		this.state = {
			timeDifference
		}
	}
	
	_getTableRow(name, value, className) {
		if (!value) {
			value = this.props.serverStaticProps[name.toLowerCase()]
		}
		return (
			<tr>
				<td>
					<small>
						{name}
					</small>
				</td>
				<td
					className={className || null}
				>
					{value}
				</td>
			</tr>
		)
	}
	
	_getTimeDifference() {
		let serverNowString = this.props.serverStaticProps.now
		return (Date.now() - serverNowString)
	}
	
	_getTimeString(time) {
		if (time) {
			let dayMillis = 24 * 60 * 60 * 1000
			let days = Math.floor(time / dayMillis)
			time = time - days * dayMillis
			let hourMillis = dayMillis / 24
			let hours = Math.floor(time / hourMillis)
			time = time - hours * hourMillis
			let minuteMillis = hourMillis / 60
			let minutes = Math.floor(time / minuteMillis)
			time = time - minutes * minuteMillis
			let secondMillis = minuteMillis / 60
			let seconds = Math.floor(time / secondMillis)
			let timeString = ''
			if (days) {
				timeString += days + 'd '
			}
			timeString += this._getZeroedDigit(hours) + ':'
			timeString += this._getZeroedDigit(minutes) + ':'
			timeString += this._getZeroedDigit(seconds)
			return timeString
		} else {
			return ''
		}
	}
	
	_getZeroedDigit(digit) {
		if (!digit) {
			return '00'
		} else if (digit < 10) {
			return '0' + digit
		} else {
			return digit
		}
	}
	
	render() {
		let show = (this.props.serverBlockNumber === this.props.number)
		if (show) {
			let gridColumnNumber = this.props.serverBlockNumber * 2
			let gridColumn = gridColumnNumber + ' / ' + gridColumnNumber
			let mainClassName = styles.main + ' mbg hiddenLink'
			let amount = 0
			if (this.props.serverStaticProps.Containers) {
				amount = Object.keys(this.props.serverStaticProps.Containers).length
			}
			let role = 'Master'
			if (!this.props.serverStaticProps.isMaster) {
				role = 'Slave'
			}
			let timeString = 0
			let uptimeString = this.props.serverStaticProps.systemUptime + '000'
			let serverNowString = this.props.serverStaticProps.now
			let now = Date.now()
			if (typeof this.state.timeDifference !== 'boolean') {
				let time = (now - this.state.timeDifference) - +uptimeString
				timeString = this._getTimeString(time)
			}
			
			return (
				<div
					className={[styles.main].join(' ')}
					style={{ gridColumn }}
				>
					<Buttons
						serverStaticProps={this.props.serverStaticProps}
						isAdmin={this.props.isAdmin}
						loginMenuOpener={this.props.loginMenuOpener}
						emit={this.props.emit}
						buttonsState={this.props.buttonsState}
					/>
					<div>
						<table className={[styles.infoTable].join(' ')}>
							<tbody>
								{this._getTableRow('Domain', false, styles.bold)}
								{this._getTableRow('IP')}
								{this._getTableRow('Stage', false, styles.bold)}
								{this._getTableRow('Amount', amount + ' containers')}
								<tr className={styles.infoTableDivider} />
								{this._getTableRow('Role', role)}
								{this._getTableRow('Uptime', timeString)}
							</tbody>
						</table>
					</div>
				</div>
			)
		} else {
			return null
		}
	}
}

interface buttonsState {
	restartOptionsHidden: boolean,
	clickless: boolean,
}
class Buttons extends Component<props, buttonsState> {
	constructor(props: props) {
		super(props)
		this.state = {
			restartOptionsHidden: true,
			clickless: false,
		}
		this.ref = createRef()
	}
	
	_copyToAnotherServerOnClick() {
		this._emit('copyToAnotherServer')
		this._preventClicksForAwhile()
	}
	
	_restartOnClick() {
		this.setState({
			restartOptionsHidden: !this.state.restartOptionsHidden
		})
	}
	
	_restartContainerOnClick(hostname) {
		this.setState({
			restartOptionsHidden: true
		})
		if (this.props.isAdmin) {
			this._emit('restartContainer', hostname)
			this._preventClicksForAwhile()
		} else {
			if (this.props.loginMenuOpener) {
				this.props.loginMenuOpener()
			}
		}
	}
	
	_preventClicksForAwhile() {
		this.setState({
			clickless: true
		})
		setTimeout(() => {
			this.setState({
				clickless: false
			})
		}, 5000)
	}
	
	_emit(type, value) {
		if (!this.state.clickless) {
			let domain = this.props.serverStaticProps['domain']
			let data = { type, domain }
			if (value) {
				data.value = value
			}
			this.props.emit(data)
		}
	}
	
	_getCopyButton() {
		if (this.props.serverStaticProps.isMaster) {
			let className = 'noWrap link'
			if (this.props.buttonsState.copyToAnotherServer === 'hasReceived') {
				className += ' clicked'
			}
			return (
				<span>
					<span
						className={className}
						onClick={this._copyToAnotherServerOnClick.bind(this)}
					>
						Copy to another server
					</span>
					<span className='noWrap buttonComma'>
						, 
					</span>
				</span>
			)
		} else {
			return null
		}
	}
	
	_getMark() {
		if (!this.state.restartOptionsHidden) {
			return (
				<small>
					&#x25BE;
				</small>
			)
		} else {
			return null
		}
	}
	
	_onCloseButton() {
		this.setState({ restartOptionsHidden: true })
	}
	
	render() {
		let restartClass = 'noWrap link ' + styles.restart
		return (
			<div className={styles.left}>
				{this._getCopyButton()}
				<div 
					className={restartClass}
					onClick={this._restartOnClick.bind(this)}
				>
					restart
					{this._getMark()}
					<RestartContainerList
						restartOptionsHidden={this.state.restartOptionsHidden}
						containers={this.props.serverStaticProps.Containers}
						onClick={this._restartContainerOnClick.bind(this)}
					/>
					<CloseButton
						hidden={true}
						parentClasses={restartClass}
						onClose={this._onCloseButton.bind(this)}
					/>
				</div>
			</div>
		)
	}
}

interface RestartContainerListProps {
	restartOptionsHidden: boolean,
	containers: containers,
	onClick: ((hostname: string) => void)
}
class RestartContainerList extends Component<RestartContainerListProps> {
	constructor(props: RestartContainerListProps) {
		super(props)
	}
	
	_onClick(hostname) {
		this.props.onClick(hostname)
	}
	
	_getRows() {
		let jsx = []
		if (this.props.containers) {
			Object.keys(this.props.containers).sort().forEach(hostname => {
				let name = this.props.containers[hostname].name
				let Name = name.substring(0, 1).toUpperCase() + name.substring(1)
				jsx.push(this._getRow(hostname, Name))
			})
		}
		jsx.push(this._getRow('_all', 'All'))
		return jsx
	}
	
	_getRow(hostname, name) {
		return (
			<li 
				key={hostname}
				className={styles.menuItem}
				onClick={this._onClick.bind(this, hostname)}
			>
				{name}
			</li>
		)
	}
	
	render() {
		if (!this.props.restartOptionsHidden) {
			return (
				<ul className={styles.menu}>
					{this._getRows()}
				</ul>
			)
		} else {
			return null
		}
	}
}


export default ServerBlockTitle