import * as t from '../types/types'
import { Component } from 'react'
import Head from 'next/head'
import Main from '../components/Main'
import Uid from '../../../../../../../assets/common/Uid'
import WebsocketOnClient from '../../../../../../../assets/common/WebsocketOnClient'

class Multiserver extends Component<t.indexProps, t.IndexState> {
	private readonly label: string
	private websocket: WebsocketOnClient & t.obj<t.func<any, void>>
	private domain: string
	private _getDomainShortLogUniqueDateObject: t.obj<boolean>
	private _zeroingStatisticsST: NodeJS.Timeout
	
	constructor(props: t.indexProps) {
		super(props)
		this.label = 'Multiserver'
		this.state = {
			uptimeDates: {},
			roles: {},
			statistics: {},
			shortLogDates: {},
			shortLogs: {},
			buttonsState: {},
			passIsIncorrect: false,
			isAdmin: false,
			statisticsTree: {},
		}
		this.domain = this._getDomain(this.props.staticObject)
		this._setSocket()
		new Uid()
	}
	
	emit(data): void {
		this.websocket.emit(data)
	}
	
	render(): JSX.Element {
		let title = this.label
		let description = 'Bunch of containers and servers, with statistics and restart tool.'
		let url = 'https://' + this.domain + '/' + this.label.toLowerCase()
		let roundedDate = (Date.now() + '').substring(0, 8)
		let imageUrl = url + '/ogImage.png?' + roundedDate
		return (
			<>
				<Head>
					<title>
						{title}
					</title>
					<meta name="viewport" content="initial-scale=1.0, width=device-width, user-scalable=no" />
					<meta name="description" content={description} />
					<meta property="og:type" content="website" key="type" />
					<meta property="og:site_name" content={this.domain} key="siteName" />
					<meta property="og:title" content={title} key="title" />
					<meta property="og:description" content={description} key="description" />
					<meta property="og:url" content={url} key="url" />
					<meta property="og:image" content={imageUrl} key="image" />
					<meta name="twitter:card" content="summary_large_image" key="twitter:card" />
					<meta name="twitter:image" content={imageUrl} key="twitter:image" />
					<link rel="icon" href="/favicon.ico" />
				</Head>
				<Main 
					staticProps={this.props.staticObject}
					uptimeDates={this.state.uptimeDates}
					roles={this.state.roles}
					statistics={this.state.statistics}
					shortLogs={this.state.shortLogs}
					emit={this.emit.bind(this)}
					buttonsState={this.state.buttonsState}
					passIsIncorrect={this.state.passIsIncorrect}
					isAdmin={this.state.isAdmin}
				/>
			</>
		)
	}
	
	componentDidUpdate(): void {
		document.documentElement.style.setProperty('--vh', `${window.innerHeight/100}px`);
	}
	
	private _setSocket(): void {
		if (!this.websocket) {
			let label = this.label.toLowerCase()
			this.websocket = (new WebsocketOnClient(label) as Multiserver['websocket'])
			this.websocket.onData = this._onWebsocket.bind(this)
		}
	}
	
	private _onWebsocket(data: any): void {
		if (data) {
			if (data.statistics) {
				this._zeroingStatistics(data.statistics)
			}
			if (data.shortLogDates) {
				Object.keys(data.shortLogDates).forEach(domain => {
					let stateDomainDate = this.state.shortLogDates[domain]
					let dataDomainDate = data.shortLogDates[domain]
					if (stateDomainDate !== dataDomainDate) {
						this._getDomainShortLog(domain, dataDomainDate)
					}
				})
			}
			if (data.domainShortLogData && data.domain) {
				let lastDate = data.domainShortLogData.lastDate
				let shortLog = data.domainShortLogData.shortLog
				let shortLogDates = this.state.shortLogDates
				shortLogDates[data.domain] = data.domainShortLogData.lastDate
				let shortLogs = this.state.shortLogs
				shortLogs[data.domain] = data.domainShortLogData.shortLog
				this.setState({ shortLogDates, shortLogs })
			}
			if (data.uptimeDates) {
				let uptimeDates = this.state.uptimeDates
				let now = Date.now()
				Object.keys(data.uptimeDates).forEach(domain => {
					let dates = data.uptimeDates[domain]
					if (dates.now) {
						uptimeDates[domain] = +(dates.systemUptime + '000') - (now - data.uptimeDates[domain].now)
					}
				})
				this.setState({ uptimeDates })
			}
			if (data.roles) {
				this.setState({ roles: data.roles })
			}
			if (data.type) {
				if (data.type === 'copyToAnotherServerHasReceived') {
					let buttonsState = this.state.buttonsState
						buttonsState.copyToAnotherServer = 'hasReceived'
					this.setState({ buttonsState })
				}
				if (data.type === 'copyToAnotherServerHasDone') {
					let buttonsState = this.state.buttonsState
						buttonsState.copyToAnotherServer = false
					this.setState({ buttonsState })
				}
				if (data.type === 'passIsIncorrect') {
					this.setState({ 
						passIsIncorrect: true,
						isAdmin: false
					})
					setTimeout(() => {
						this.setState({ passIsIncorrect: false })
					}, 1000)
				}
				if (data.type === 'passIsCorrect') {
					this.setState({
						passIsIncorrect: false,
						isAdmin: true
					})
				}
				if (data.type === 'logout') {
					this.setState({
						isAdmin: false
					})
				}
			}
		}
	}
	
	private _getDomainShortLog(domain, dataDomainDate): void {
		if (!this._getDomainShortLogUniqueDateObject) {
			this._getDomainShortLogUniqueDateObject = {}
		}
		if (!this._getDomainShortLogUniqueDateObject[domain + dataDomainDate]) {
			this._getDomainShortLogUniqueDateObject[domain + dataDomainDate] = true
			this.websocket.emit({ type: 'getDomainShortLog', domain })
		}
	}
	
	private _zeroingStatistics(statistics: t.IndexState['statistics']): void {
		if (!Object.keys(this.state.statisticsTree).length) {
			let tree: t.IndexState['statisticsTree'] = {}
			if (this.props.staticObject) {
				Object.keys(this.props.staticObject).forEach(domain => {
					tree[domain] = {}
					Object.keys(this.props.staticObject[domain].Containers).forEach(hostname => {
						tree[domain][hostname] = false
					})
				})
				if (this.props.staticObject) {
					this.setState({
						statisticsTree: tree
					})
				}
			}
		} else {
			let newStatistics: t.IndexState['statistics'] = {}
			Object.keys(this.state.statisticsTree).forEach(domain => {
				newStatistics[domain] = {}
				Object.keys(this.state.statisticsTree[domain]).forEach(hostname => {
					newStatistics[domain][hostname] = false
					if (statistics[domain]) {
						let newData = statistics[domain][hostname]
						if (newData) {
							newStatistics[domain][hostname] = newData
						}
					}
				})
			})
			this.setState({
				statistics: newStatistics
			})
			if (this._zeroingStatisticsST) {
				clearTimeout(this._zeroingStatisticsST)
			}
			this._zeroingStatisticsST = setTimeout(() => {
				this.setState({
					statistics: this.state.statisticsTree
				})
			}, 1000)
		}
	}
	
	private _getDomain(statics: t.indexProps['staticObject']): string {
		let currentDomain = ''
		if (statics) {
			Object.keys(statics).some(domain => {
				if (statics[domain].isCurrent) {
					currentDomain = domain
					return true
				}
			})
		}
		return currentDomain
	}
}

export default Multiserver


// import DataHandler from '../../../../../../../assets/DataHandler'
// import { GetStaticProps } from 'next'
// export const getStaticProps: GetStaticProps = async () => {
	// let props: t.indexProps = {}
	// try {
		// let dataHandler = new DataHandler()
		// props = await dataHandler.getProps()
	// } catch (error) {
		// props.error = error.toString()
	// }
	// return { props }
// }

import fs from 'fs'
import { GetStaticProps } from 'next'
export const getStaticProps: GetStaticProps = () => {
	let props: t.indexProps = {}
	try {
		const sda = (process.env.SDA ?? '') as string
		const afterTildaPath = (process.env.AFTER_TILDA ?? '') as string
		let staticFileString = sda + '/' + afterTildaPath + 'stageSensitive/staticObject.json'
		let data = fs.readFileSync(staticFileString)
		props.staticObject = JSON.parse(data.toString())
	} catch (error) {
		props.error = error.toString()
	}
	return { props }
}