import { Component } from 'react'
import ColoredContainer from './ColoredContainer'
import { containers, staticObjectDomain } from '../../../../../../../currentPath/DataHandler'
import styles from '../styles/detailed.module.scss'

interface props {
	currentServerStaticProps: staticObjectDomain,
}
class Detailed extends Component<props> {
	constructor(props: props) {
		super(props)
	}
	
	render() {
		if (this.props.currentServerStaticProps) {
			let iFrameUrl = 'https://' + this.props.currentServerStaticProps.domain + '/logs'
			let iFrameTitle = `Logs @ ${this.props.currentServerStaticProps.domain}`
			return (
				<>
					<Containers
						serverStaticProps={this.props.currentServerStaticProps}
						containers={this.props.containers}
						statistics={this.props.currentStatistics}
					/>
					<div
						className={styles.logs}
					>
						<iframe
							src={iFrameUrl}
							title={iFrameTitle}
							className={styles.iframe}
						>
						</iframe>
					</div>
				</>
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
	
	_getValueTdJSX(type, value, shift) {
		let className = styles.td + ' ' + styles.right
		if (shift) {
			className += ' ' + styles.pt
		}
		return (
			<td className={className}>
				{this._getValueJSX(type, value)}
			</td>
		)
	}
	
	_getValueJSX(type, value) {
		let className = styles[type]
		if (value) {
			return (
				<small className={className}>
					{value}
				</small>
			)
		} else {
			return null
		}
	}
	
	_getJSX() {
		let jsx = []
		if (this.props.containers) {
			let shiftForOld = false
			this.props.containers.forEach(hostname => {
				let name = this.props.serverStaticProps.Containers[hostname].name
				let type = this.props.serverStaticProps.Containers[hostname].type
				let containerClass = styles.td
				if (type.includes('subsections')) {
					containerClass += ' ' + styles.pl
				}
				if (type.includes('old') && !shiftForOld) {
					shiftForOld = true
					containerClass += ' ' + styles.pt
				}
				
				let statisticsArray = []
				let cpuString = false
				let memoryString = false
				if (this.props.statistics) {
					if (this.props.statistics[hostname]) {
						statisticsArray = this.props.statistics[hostname]
						cpuString = this._formatCpu(statisticsArray[0])
						memoryString = statisticsArray[1] + ''
					}
				}
				jsx.push(
					<tr key={hostname} >
						<td className={containerClass}>
							<ColoredContainer
								name={name}
								hostname={hostname}
								statisticsArray={statisticsArray}
								current={true}
								small={false}
							/>
						</td>
						{this._getValueTdJSX('cpu', cpuString, shiftForOld)}
						{this._getValueTdJSX('memory', memoryString, shiftForOld)}
					</tr>
				)
			})
		}
		return jsx
	}
	
	_formatCpu(value) {
		let string = '0.00'
		if (value !== 0) {
			if (value >= 10) {
				value = Math.ceil(value * 10) / 10
			}
			string = value + ''
			if (!string.includes('.')) {
				string += '.0'
			}
			if (value >= 100) {
				value = 100
				string = value + ''
			}
		}
		if (string) {
			let digitsInString = string.replace('.', '')
			if (digitsInString.length <= 2) {
				string += '0'
			}
		}
		return string
	}
	
	render() {
		return (
			<div 
				className={styles.containers}
			>
				<table>
					<tbody>
						{this._getJSX()}
					</tbody>
				</table>
			</div>
		)
	}
}

export default Detailed