import { Component } from 'react'
import ServerBlockInfo from './ServerBlockInfo'
import ServerBlockTitle from './ServerBlockTitle'
import styles from '../styles/serverBlock.module.scss'
import { staticObjectDomain } from '../../../../../../../currentPath/DataHandler'

interface props {
	key: string,
	serverBlockNumber: number,
	serverStaticProps: staticObjectDomain,
	onClick: ((number: number) => void)
}
class ServerBlock extends Component<props> {
	constructor(props: props) {
		super(props)
		this.number = (this.props.serverStaticProps.id + 1)
	}
	
	render() {
		let gridColumnNumber = this.number * 2
		let gridColumn = gridColumnNumber + ' / ' + gridColumnNumber
		let mainClassName = styles.main + ' mbg hiddenLink'
		if (!this.props.serverStaticProps.isCurrent) {
			mainClassName += ' ' + styles.notCurrent
		}
		
		return (
			<>
				<ServerBlockInfo
					number={this.number}
					serverBlockNumber={this.props.serverBlockNumber}
					serverStaticProps={this.props.serverStaticProps}
					currentStatistics={this.props.currentStatistics}
					shortLog={this.props.shortLog}
					onClick={this.props.onClick}
				/>
				<ServerBlockTitle
					number={this.number}
					serverBlockNumber={this.props.serverBlockNumber}
					serverStaticProps={this.props.serverStaticProps}
					isAdmin={this.props.isAdmin}
					loginMenuOpener={this.props.loginMenuOpener}
					emit={this.props.emit}
					buttonsState={this.props.buttonsState}
				/>
				<BottomBorder
					number={this.number}
					serverBlockNumber={this.props.serverBlockNumber}
				/>
			</>
		)
	}
}

interface clickerProps {
	onClick: any
}
class Clicker extends Component<clickerProps> {
	constructor(props: clickerProps) {
		super(props)
	}
	
	onClick() {
		this.props.onClick(this.props.number)
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
				/>
			)
		} else {
			return null
		}
	}
}

interface props {
	number: number,
	serverBlockNumber: number,
}
class BottomBorder extends Component<props> {
	constructor(props: props) {
		super(props)
	}
	
	render() {
		let gridColumnNumber = this.props.number * 2
		let gridColumnStart = (gridColumnNumber - 1)
		let gridColumnEnd = (gridColumnNumber + 2)
		let mainClassName = styles.bottomBorder
		if (this.props.number === 1) {
			mainClassName += ' ' + styles.left
			gridColumnStart = gridColumnNumber
		} else if (this.props.number === 4) {
			mainClassName += ' ' + styles.right
			gridColumnEnd = (gridColumnNumber + 1)
		}
		if (this.props.number === this.props.serverBlockNumber) {
			mainClassName += ' ' + styles.current
			gridColumnStart = gridColumnNumber
			gridColumnEnd = (gridColumnNumber + 1)
			if (this.props.serverBlockNumber === 1) {
				mainClassName += ' ' + styles.leftCurrent
			} else if (this.props.serverBlockNumber === 4) {
				mainClassName += ' ' + styles.rightCurrent
			}
		}
		let gridColumn = gridColumnStart  + ' / ' + gridColumnEnd
		
		return (
			<div
				className={mainClassName}
				style={{ gridColumn }}
			/>
		)
	}
}

export default ServerBlock