import { Component } from 'react'
import Head from 'next/head'
import Main from '../components/Main'
import { props } from '../../../../../../../currentPath/DataHandler'
import Uid from '../../../../../../../assets/common/Uid'
import WebsocketOnClient from '../../../../../../../assets/common/WebsocketOnClient'

interface IndexState {
	
}
class Multiserver extends Component<props, IndexState> {
	label: string
	websocket: WebsocketOnClient
	constructor(props: props) {
		super(props)
		this.label = 'Multiserver'
		this.state = {
			uptimeDates: {},
			shortLogDates: {},
			shortLogs: {},
			buttonsState: {},
			passIsIncorrect: false,
			isAdmin: false,
		}
		this._setSocket()
		new Uid()
	}
	
	emit(data) {
		this.websocket.emit(data)
	}
	
	render() {
		let title = this.label
		let url = 'https://' + this.props.domain + '/' + this.label.toLowerCase()
		let description = "Bunch of containers and servers."
		return (
			<>
				<Head>
					<title>
						{title}
					</title>
					<meta name="viewport" content="initial-scale=1.0, width=device-width, user-scalable=no" />
					<meta name="description" content={description} />
					<meta property="og:site_name" content={this.props.domain} key="siteName" />
					<meta property="og:title" content={title} key="title" />
					<meta property="og:description" content={description} key="description" />
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
	
	componentDidMount() {
		document.documentElement.style.setProperty('--vh', `${window.innerHeight/100}px`);
	}
	
	private _setSocket() {
		if (!this.websocket) {
			let label = this.label.toLowerCase()
			this.websocket = new WebsocketOnClient(label)
			this.websocket.onData = this._onWebsocket.bind(this)
		}
	}
	
	private _onWebsocket(data) {
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
			if (data.domainShortLogData) {
				let domain = data.domain
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
	
	private _getDomainShortLog(domain, dataDomainDate) {
		if (!this._getDomainShortLogUniqueDateObject) {
			this._getDomainShortLogUniqueDateObject = {}
		}
		if (!this._getDomainShortLogUniqueDateObject[domain + dataDomainDate]) {
			this._getDomainShortLogUniqueDateObject[domain + dataDomainDate] = true
			this.websocket.emit({ type: 'getDomainShortLog', domain })
		}
	}
	
	private _zeroingStatistics(statistics) {
		if (!this.state.statisticsTree) {
			let tree = {}
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
		} else {
			let newStatistics = {}
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
}

export default Multiserver


import DataHandler from '../../../../../../../assets/DataHandler'
import { GetStaticProps } from 'next'
export const getStaticProps: GetStaticProps = async () => {
	let props: props = {}
	try {
		let dataHandler = new DataHandler()
		props = await dataHandler.getProps()
	} catch (error) {
		props.error = error.toString()
	}
	return { props }
}