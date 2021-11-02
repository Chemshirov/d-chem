import { Component } from 'react'
import styles from '../styles/coloredContainer.module.scss'

interface props {
	name: string,
	hostname: string,
	small: boolean,
	current: boolean,
}
class ColoredContainer extends Component<props> {
	constructor(props: props) {
		super(props)
	}
	
	_getCpuStyle() {
		let styleValue = false
		let array = this.props.statisticsArray
		if (array && array.length === 2) {
			let cpuValue = array[0]
			let magnifiedValue = cpuValue * 5
			if (cpuValue > 1) {
				magnifiedValue = cpuValue
			}
			let lowLimit = (1 / 100)
			let toAboveOne = 1 + lowLimit
			let shift = Math.log10(toAboveOne)
			let logValue = Math.log10(+magnifiedValue + toAboveOne)
			let shiftedLogValue = logValue - shift
			let maxLogValue = Math.log10(100 + lowLimit) - shift
			let logValueToOne = shiftedLogValue / maxLogValue
			let newValuePercent = Math.ceil(logValueToOne * 100)
			styleValue = `linear-gradient(0deg, red ${newValuePercent}%, greenyellow 0%)`
		}
		return this._getStyleByString(styleValue)
	}
	
	_getMemStyle() {
		let styleValue = false
		let array = this.props.statisticsArray
		if (array && array.length === 2) {
			let memValue = array[1]
			if (memValue > 1000) {
				memValue = 1000
			}
			let roundedMemPercent = Math.floor(memValue / 10)
			styleValue = `linear-gradient(0deg, SlateBlue ${roundedMemPercent}%, greenyellow 0%)`
		}
		return this._getStyleByString(styleValue)
	}
	
	_getStyleByString(string) {
		let style = {}
		if (string) {
			style = { 'background': string }
		}
		return style
	}
	
	_getMainJSX() {
		let name = this.props.name
		let className = styles.main
		if (this.props.current) {
			className += ' ' + styles.current
		}
		if (this.props.small) {
			return (
				<small
					className={className}
				>
					{name}
				</small>
			)
		} else {
			return (
				<span
					className={className}
				>
					{name}
				</span>
			)
		}
	}
	
	render() {
		let containerClass = styles.container
		if (this.props.statisticsArray && +this.props.statisticsArray[0] > 1) {
			containerClass += ' ' + styles.alarm
		}
		let classCpu = styles.indicator + ' ' + styles.cpu
		let classMemory = styles.indicator
		let cpuStyle = this._getCpuStyle()
		let memStyle = this._getMemStyle()
		return (
			<span className={containerClass}>
				{this._getMainJSX()}
				<span 
					className={classCpu}
					style={cpuStyle}
				/>
				<span 
					className={classMemory}
					style={memStyle}
				/>
			</span>
		)
	}
}

export default ColoredContainer