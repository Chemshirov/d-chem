import CloseButton from './CloseButton'
import { Component, createRef } from 'react'
import ServerBlockButtons from './ServerBlockButtons'
import styles from '../styles/serverBlockTitle.module.scss'
import { staticObjectDomain, containers } from '../../../../../../../currentPath/DataHandler'

interface props {
	serverBlockNumber: number,
	serverStaticProps: staticObjectDomain
}
class ServerBlockTitle extends Component<props> {
	constructor(props: props) {
		super(props)
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
	
	_getUptime() {
		let uptime = 0
		if (this.props.uptimeDates) {
			let time = (Date.now() - this.props.uptimeDates)
			uptime = this._getTimeString(time)
		}
		return uptime
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
			let role = false
			if (this.props.role) {
				role = this.props.role.substring(0, 1).toUpperCase() + this.props.role.substring(1)
			}
			let uptime = this._getUptime()
			
			return (
				<div
					className={styles.main}
					style={{ gridColumn }}
				>
					<ServerBlockButtons
						serverStaticProps={this.props.serverStaticProps}
						role={this.props.role}
						containers={this.props.containers}
						isAdmin={this.props.isAdmin}
						loginMenuOpener={this.props.loginMenuOpener}
						emit={this.props.emit}
						buttonsState={this.props.buttonsState}
					/>
					<div>
						<table className={styles.infoTable}>
							<tbody>
								{this._getTableRow('Domain', false, styles.bold)}
								{this._getTableRow('IP')}
								{this._getTableRow('Stage', false)}
								{this._getTableRow('Amount', amount + ' containers')}
								<tr className={styles.infoTableDivider} />
								{this._getTableRow('Role', role, styles.bold)}
								{this._getTableRow('Uptime', uptime)}
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

export default ServerBlockTitle