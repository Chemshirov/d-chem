import * as t from '../types/types'
import { Component } from 'react'
import ColoredContainer from './ColoredContainer'
import styles from '../styles/detailed.module.scss'

class Detailed extends Component<t.detailedProps> {
	constructor(props: t.detailedProps) {
		super(props)
	}
	
	_getLogs(): JSX.Element {
		let iFrameUrl = 'https://' + this.props.currentServerStaticProps.domain + '/logs'
		let iFrameTitle = `Logs @ ${this.props.currentServerStaticProps.domain}`
		return (
			<iframe
				src={iFrameUrl}
				title={iFrameTitle}
				className={styles.iframe}
			>
			</iframe>
		)
	}
	
	render(): JSX.Element | null {
		if (this.props.currentServerStaticProps) {
			return (
				<>
					<Containers
						currentServerStaticProps={this.props.currentServerStaticProps}
						containers={this.props.containers}
						currentStatistics={this.props.currentStatistics}
					/>
					<div
						className={styles.logs}
					>
						{this._getLogs()}
					</div>
				</>
			)
		} else {
			return null
		}
	}
}

class Containers extends Component<t.detailedProps> {
	constructor(props: t.detailedProps) {
		super(props)
	}
	
	private _getValueTdJSX(type, value, shift): JSX.Element {
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
	
	private _getValueJSX(type, value): JSX.Element | null {
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
	
	private _getJSX(): Array<JSX.Element> {
		let jsx = []
		if (this.props.containers) {
			let shiftForOldFirst = false
			if (this.props.containers) {
				this.props.containers.forEach(hostname => {
					let container = this.props.currentServerStaticProps.Containers[hostname]
					let name = container.name
					let type = container.type
					let containerClass = styles.td
					if (type.includes('subsections')) {
						containerClass += ' ' + styles.pl
					}
					let shiftForOld = false
					if (type.includes('old') && !shiftForOldFirst) {
						shiftForOldFirst = true
						shiftForOld = true
						containerClass += ' ' + styles.pt
					}
					
					let statisticsArray: t.coloredContainerProps['statisticsArray'] = false
					let cpuString: false | string = false
					let memoryString: false | string = false
					if (this.props.currentStatistics) {
						if (this.props.currentStatistics[hostname]) {
							statisticsArray = this.props.currentStatistics[hostname]
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
		}
		return jsx
	}
	
	private _formatCpu(value: number | false): string {
		let string = '0.00'
		if (value && value !== 0) {
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
	
	render(): JSX.Element {
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