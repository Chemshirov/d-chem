import * as t from '../types/types'
import { Component } from 'react'
import Header from './Header'
import ServerBlock from './ServerBlock'
import Detailed from './Detailed'
import styles from '../styles/Main.module.scss'

class Main extends Component<t.mainProps, t.mainState> {
	private _loginMenuOpener: t.func<void, void>
	
	constructor(props: t.mainProps) {
		super(props)
		let { serverBlockNumber, currentDomain } = this._getCurrent()
		let allContainers = this._getContainers()
		this.state = {
			chosenServerBlock: false,
			serverBlockNumber,
			currentDomain,
			allContainers,
		}
	}
	
	public onServerBlockHasChosen(number): void {
		let chosenServerBlock = number
		if (this.state.chosenServerBlock === number) {
			chosenServerBlock = false
		}
		let { currentDomain } = this._getCurrent(number)
		this.setState({
			chosenServerBlock,
			serverBlockNumber: number,
			currentDomain,
		})
	}
	
	public loginMenuOpener(initializeCallback): void {
		if (initializeCallback) {
			this._loginMenuOpener = initializeCallback
		} else {
			if (this._loginMenuOpener) {
				this._loginMenuOpener()
			}
		}
	}
	
	render(): JSX.Element | null {
		let currentStatistics: t.detailedProps['currentStatistics'] = false
		if (this.props.statistics && this.props.statistics[this.state.currentDomain]) {
			currentStatistics = this.props.statistics[this.state.currentDomain]
		}
		if (this.props.staticProps) {
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
						currentServerStaticProps={this.props.staticProps[this.state.currentDomain]}
						containers={this.state.allContainers[this.state.currentDomain]}
						currentStatistics={currentStatistics}
					/>
				</div>
			)
		} else {
			return null
		}
	}
	
	private _getCurrent(serverBlockNumber?: number): t.mainGetCurrentOutput {
		let currentDomain
		if (this.props.staticProps) {
			let domains = Object.keys(this.props.staticProps)
			domains.some(domain => {
				if (!serverBlockNumber) {
					if (this.props.staticProps[domain].isCurrent) {
						serverBlockNumber = this.props.staticProps[domain].id + 1
						currentDomain = domain
						return true
					}
				} else {
					if (serverBlockNumber === this.props.staticProps[domain].id + 1) {
						currentDomain = domain
						return true
					}
				}
			})
		}
		return { serverBlockNumber, currentDomain }
	}
	
	private _getContainers(): t.mainState['allContainers'] {
		let allContainers = {}
		if (this.props.staticProps) {
			Object.keys(this.props.staticProps).forEach(domain => {
				allContainers[domain] = this._getContainersList(domain)
			})
		}
		return allContainers
	}
	
	private _getContainersList(domain: string): t.containersList {
		let containersArray = []
		let containers = this.props.staticProps[domain].Containers
		Object.keys(containers).sort((a, b) => {
			let typeNumberA = +containers[a].type.substring(0, 1)
			let typeNumberB = +containers[b].type.substring(0, 1)
			let typeDiff = typeNumberA - typeNumberB
			if (typeDiff > 0) {
				return 1
			} if (typeDiff < 0) {
				return -1
			} else {
				let nameA = containers[a].name
				let nameB = containers[b].name
				if (nameA < nameB) {
					return -1
				} else if (nameB < nameA) {
					return 1
				} else {
					return 0
				}
			}
		}).forEach(hostname => {
			containersArray.push(hostname)
		})
		return containersArray
	}
	
	private _getServerBlocks(serverBlockNumber, props): Array<JSX.Element> {
		let serverBlocks = []
		let statistics = props.statistics
		let shortLogs = props.shortLogs
		if (this.props.staticProps) {
			let domains = Object.keys(this.props.staticProps)
			domains.forEach(domain => {
				let jsx = this._getServerBlock(domain, serverBlockNumber)
				serverBlocks.push(jsx)
			})
		}
		return serverBlocks
	}
	
	private _getServerBlock(domain, serverBlockNumber): JSX.Element {
		let serverStaticProps = this.props.staticProps[domain]
		let serverBlockOnClick = this.onServerBlockHasChosen.bind(this)
		let role: t.serverBlockProps['role'] = false
		if (this.props.roles) {
			role = this.props.roles[domain]
		}
		let currentStatistics = {}
		let shortLog = []
		if (this.props.statistics && this.props.statistics[domain]) {
			currentStatistics = this.props.statistics[domain]
		}
		if (this.props.shortLogs && this.props.shortLogs[domain]) {
			shortLog = this.props.shortLogs[domain]
		}
		return (
			<ServerBlock
				key={domain}
				chosenServerBlock={this.state.chosenServerBlock}
				serverBlockNumber={serverBlockNumber}
				serverStaticProps={serverStaticProps}
				containers={this.state.allContainers[domain]}
				uptimeDate={this.props.uptimeDates[domain]}
				role={role}
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