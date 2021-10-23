import { Component } from 'react'
import Header from './Header'
import ServerBlock from './ServerBlock'
import Detailed from './Detailed'
import styles from '../styles/Main.module.scss'
import { props, staticObjectDomain } from '../../../../../../../currentPath/DataHandler'

interface mainProps {
	staticProps: props,
}
interface state {
	serverBlockNumber: number,
	currentServerStaticProps: staticObjectDomain
}
class Main extends Component<mainProps, state> {
	constructor(props: mainProps) {
		super(props)
		let { serverBlockNumber, currentServerStaticProps, currentDomain } = this._getCurrent()
		this.state = {
			serverBlockNumber,
			currentServerStaticProps,
			currentDomain,
		}
	}
	
	onServerBlockHasChosen(number) {
		let { currentServerStaticProps, currentDomain } = this._getCurrent(number)
		this.setState({
			serverBlockNumber: number,
			currentServerStaticProps,
			currentDomain,
		})
	}
	
	loginMenuOpener(initializeCallback) {
		if (initializeCallback) {
			this._loginMenuOpener = initializeCallback
		} else {
			if (this._loginMenuOpener) {
				this._loginMenuOpener()
			}
		}
	}
	
	render() {
		let currentStatistics = false
		if (this.props.statistics && this.props.statistics[this.state.currentDomain]) {
			currentStatistics = this.props.statistics[this.state.currentDomain]
		}
		return (
			<div className={styles.container}>
				<Header
					serverBlockNumber={this.state.serverBlockNumber}
					passIsIncorrect={this.props.passIsIncorrect}
					isAdmin={this.props.isAdmin}
					loginMenuOpener={this.loginMenuOpener.bind(this)}
					emit={this.props.emit}
				/>
				{this._getServerBlocks(this.state.serverBlockNumber, this.props)}
				<Detailed
					currentServerStaticProps={this.state.currentServerStaticProps}
					currentStatistics={currentStatistics}
				/>
			</div>
		)
	}
	
	_getCurrent(serverBlockNumber?: number) {
		let currentServerStaticProps
		let currentDomain
		let domains = Object.keys(this.props.staticProps)
		domains.some(domain => {
			if (!serverBlockNumber) {
				if (this.props.staticProps[domain].isCurrent) {
					serverBlockNumber = this.props.staticProps[domain].id + 1
					currentServerStaticProps = this.props.staticProps[domain]
					currentDomain = domain
					return true
				}
			} else {
				if (serverBlockNumber === this.props.staticProps[domain].id + 1) {
					currentServerStaticProps = this.props.staticProps[domain]
					currentDomain = domain
					return true
				}
			}
		})
		if (!serverBlockNumber) {
			serverBlockNumber = 1
		}
		return { serverBlockNumber, currentServerStaticProps, currentDomain }
	}
	
	_getServerBlocks(serverBlockNumber, props) {
		let serverBlocks = []
		let statistics = props.statistics
		let shortLogs = props.shortLogs
		let domains = Object.keys(this.props.staticProps)
		domains.forEach(domain => {
			let currentStatistics = {}
			let shortLog = []
			if (statistics && statistics[domain]) {
				currentStatistics = statistics[domain]
			}
			if (shortLogs && shortLogs[domain]) {
				shortLog = shortLogs[domain]
			}
			let jsx = this._getServerBlock(domain, serverBlockNumber, currentStatistics, shortLog)
			serverBlocks.push(jsx)
		})
		return serverBlocks
	}
	
	_getServerBlock(domain, serverBlockNumber, currentStatistics, shortLog) {
		let serverStaticProps = this.props.staticProps[domain]
		let serverBlockOnClick = this.onServerBlockHasChosen.bind(this)
		return (
			<ServerBlock
				key={domain}
				serverBlockNumber={serverBlockNumber}
				serverStaticProps={serverStaticProps}
				currentStatistics={currentStatistics}
				shortLog={shortLog}
				onClick={serverBlockOnClick}
				isAdmin={this.props.isAdmin}
				loginMenuOpener={this.loginMenuOpener.bind(this)}
				emit={this.props.emit}
				buttonsState={this.props.buttonsState}
			/>
		)
	}
}

export default Main