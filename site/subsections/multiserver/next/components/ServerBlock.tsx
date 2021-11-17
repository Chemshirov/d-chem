import * as t from '../types/types'
import { Component } from 'react'
import ServerBlockInfo from './ServerBlockInfo'
import ServerBlockTitle from './ServerBlockTitle'
import styles from '../styles/serverBlock.module.scss'

class ServerBlock extends Component<t.serverBlockProps> {
	private number: number
	
	constructor(props: t.serverBlockProps) {
		super(props)
		this.number = (this.props.serverStaticProps.id + 1)
	}
	
	render(): JSX.Element {
		let gridColumnNumber = this.number * 2
		let gridColumn = gridColumnNumber + ' / ' + gridColumnNumber
		let mainClassName = styles.main + ' ' + styles.mbg + ' hiddenLink'
		if (!this.props.serverStaticProps.isCurrent) {
			mainClassName += ' ' + styles.notCurrent
		}
		
		return (
			<>
				<ServerBlockInfo
					number={this.number}
					serverBlockNumber={this.props.serverBlockNumber}
					chosenServerBlock={this.props.chosenServerBlock}
					serverStaticProps={this.props.serverStaticProps}
					containers={this.props.containers}
					role={this.props.role}
					currentStatistics={this.props.currentStatistics}
					shortLog={this.props.shortLog}
					onClick={this.props.onClick}
					isAdmin={this.props.isAdmin}
					loginMenuOpener={this.props.loginMenuOpener}
					emit={this.props.emit}
					buttonsState={this.props.buttonsState}
				/>
				<ServerBlockTitle
					number={this.number}
					serverBlockNumber={this.props.serverBlockNumber}
					serverStaticProps={this.props.serverStaticProps}
					containers={this.props.containers}
					role={this.props.role}
					uptimeDate={this.props.uptimeDate}
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

interface props {
	number: ServerBlock['number'],
	serverBlockNumber: t.serverBlockProps['serverBlockNumber'],
}
class BottomBorder extends Component<props> {
	constructor(props: props) {
		super(props)
	}
	
	render(): JSX.Element {
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