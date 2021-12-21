import { Component } from 'react'
import Head from 'next/head'
import MakeTree from '../scripts/MakeTree'
import Navbar from '../components/Navbar'
import ScrollableTable from '../components/ScrollableTable'
import Settings from '../scripts/Settings'
import Uid from '../scripts/Uid'
import Websockets from '../scripts/Websockets'
import 'bootstrap/dist/css/bootstrap.css'

interface IndexProps {
	domain: string,
	ip: string,
	prefix: string,
	logs: object,
	errors: object,
	lastDate: string,
	revalidate: number,
	error: object | boolean
}
interface IndexState {
	ip: string,
	lastDate: string,
	logs: object,
	errors: object,
	tree: object,
	showLabel: string,
	list: object
}
export default class Logs extends Component<IndexProps, IndexState> {
	label: string
	websocket: any
	constructor(props: IndexProps) {
		super(props)
		this.label = 'Logs'
		let { tree } = new MakeTree(this.props.logs, this.props.errors).get()
		let list = this._getList(Settings.typesName + Settings.allName, tree)
		this.state = {
			ip: this.props.ip,
			lastDate: this.props.lastDate,
			logs: this.props.logs,
			errors: this.props.errors,
			tree,
			showLabel: Settings.typesName + Settings.allName,
			list
		}
		new Uid()
		this._setSocket()
		if (this.props.error) {
			console.log(this.props.error)
		}
	}
	
	protected _setSocket() {
		let label = this.label.toLowerCase()
		let lastDate = this.state.lastDate
		let callback = this._onNews.bind(this)
		this.websocket = new Websockets(label, lastDate, callback)
		this.websocket.setLastDate(lastDate)
		this.websocket.getNews()
	}
	
	protected _onNews(data) {
		// Error: if no errors at start then no new ones will be added
		let {logs, errors, tree} = new MakeTree(this.state.logs, this.state.errors, data).get()
		let newList = this._getList(this.state.showLabel, tree)
		this.setState({
			lastDate: data.maxDate,
			logs,
			errors,
			tree,
			list: newList
		})
		this.websocket.setLastDate(data.maxDate)
	}
	
	protected _onNavButtonClick(name) {
		let newList = this._getList(name)
		this.setState({
			showLabel: name,
			list: newList
		})
	}
	
	protected _getList(showLabel: IndexState['showLabel'], tree?: IndexState['tree']) {
		if (!showLabel) {
			showLabel = this.state.showLabel
		}
		if (!tree) {
			tree = this.state.tree
		}
		if (showLabel !== Settings.allName) {
			if (showLabel.startsWith(Settings.typesName)) {
				showLabel = showLabel.replace(Settings.typesName, '')
				if (tree[Settings.typesName] && tree[Settings.typesName][showLabel]) {
					return tree[Settings.typesName][showLabel]
				}
			} else {
				if (tree[Settings.labelName] && tree[Settings.labelName][showLabel]) {
					return tree[Settings.labelName][showLabel]
				}
			}
		}
		let defaultTree = {}
		if (tree[Settings.typesName]) {
			defaultTree = tree[Settings.typesName][Settings.allName]
		}
		return defaultTree
	}
	
	render() {
		let title = this.label + ' @ ' + this.props.prefix + this.state.ip
		let url = 'https://' + this.props.domain + '/' + this.label.toLowerCase()
		let description = "Quick list of logs and errors with no pagination."
		let date = new Date(this.state.lastDate)
		let dateIso = date.toISOString()
		let dateNumber = date.getTime()
		let imageUrl = url + '/ogImage.png?' + dateNumber
		
		return (
			<div className="vh-100">
				<Head>
					<title>
						{title}
					</title>
					<meta name="viewport" content="initial-scale=1.0, width=device-width" />
					<meta name="description" content={description} />
					<meta property="og:site_name" content={this.props.domain} key="siteName" />
					<meta property="og:title" content={title} key="title" />
					<meta property="og:description" content={description} key="description" />
					<meta property="og:type" content="article" key="type" />
					<meta property="og:article:modified_time" content={dateIso} key="articleMt" />
					<meta property="og:url" content={url} key="url" />
					<meta property="og:image" content={imageUrl} key="image" />
					<meta name="twitter:card" content="summary_large_image" key="twitter:card" />
					<meta name="twitter:image" content={imageUrl} key="twitter:image" />
					<link rel="icon" href="/favicon.ico" />
				</Head>
				<div className="d-flex flex-column w-100 vh-100">
					<div className="w-100">
						<Navbar
							title={title}
							tree={this.state.tree}
							showLabel={this.state.showLabel}
							onNavButtonClick={this._onNavButtonClick.bind(this)}
						/>
					</div>
					<div className="w-100 h-100 flex-grow-1 overflow-hidden">
						<ScrollableTable
							list={this.state.list}
							showLabel={this.state.showLabel}
						/>
					</div>
				</div>
			</div>
		)
	}
}

import fs from 'fs'
import { GetStaticProps } from 'next'
const sda = (process.env.SDA ?? '') as string
const afterTildaPath = (process.env.AFTER_TILDA ?? '') as string
export const getStaticProps: GetStaticProps = () => {
	let props: IndexProps = {
		domain: '',
		ip: 'ip',
		prefix: process.env.PREFIX,
		logs: {},
		errors: {},
		lastDate: new Date(0).toISOString().replace(/[tz]/gi, ' ').trim(),
		revalidate: 300,
		error: false
	}
	try {
		let staticFileString = sda + '/' + afterTildaPath + 'stageSensitive/props.json'
		let data = fs.readFileSync(staticFileString)
		props = JSON.parse(data.toString())
	} catch (error) {
		props.error = error.toString()
	}
	let revalidate = props.revalidate
	return { props, revalidate }
}