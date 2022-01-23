import * as t from '../types/types'
import * as fs from 'fs'
import { Component } from 'react'
import Head from 'next/head'

import Fullscreener from '../components/Fullscreener'
import Main from '../components/Main.index'

export default class Index extends Component<t.indexProps, t.indexState> {
	private readonly label: string
	private _wheelOpt: false | t.obj<boolean>
	private _wheelEvent: string
	private _eventHandlers: t.obj<t.eventHandler>
	
	constructor(props: t.indexProps) {
		super(props)
		this.state = {
			toFullscreen: null,
			keydownBlocks: {},
		}
		this.label = 'Index'
		this._wheelOpt = false
		this._wheelEvent = 'mousewheel'
		this._eventHandlers = {}
	}
	
	private _setFullscreen(toFullscreen): void {
		this.setState({ toFullscreen })
	}
	
	private _setEventHandler(name, eventHandler): void {
		if (eventHandler) {
			this._eventHandlers[name] = eventHandler
		} else {
			if (this._eventHandlers[name]) {
				delete this._eventHandlers[name]
			}
		}
	}
	
	private _setKeydownBlock(keyCode, name?): void {
		let keydownBlocks = Object.assign({}, this.state.keydownBlocks, {[keyCode]: name})
		this.setState({ keydownBlocks })
	}
	
	private _onEvent(event): void {
		let handlersArray = Object.keys(this._eventHandlers)
		handlersArray.forEach(name => {
			let eventHandler = this._eventHandlers[name]
			if (typeof eventHandler === 'function') {
				eventHandler(event)
			}
		})
	}
	
	render(): JSX.Element {
		let title = this.props.passport.name + ' ' + this.props.passport.surname + "'s site"
		let contact = this.props.contacts.Telegram
		let description = 'Write me to Telegram: ' + contact
		let url = 'https://' + this.props.domain + '/'
		let imageUrl = url + this.label.toLowerCase() + '/ogImage.png'
		let viewport = 'initial-scale=0.5, width=device-width, user-scalable=no'
		return (
			<>
				<Head>
					<title>
						{title}
					</title>
					<meta name="viewport" content={viewport} key="viewport" />
					<meta name="description" content={description} key="description" />
					<meta property="og:type" content="website" key="type" />
					<meta property="og:site_name" content={this.props.domain} key="siteName" />
					<meta property="og:title" content={title} key="title" />
					<meta property="og:description" content={description} key="og:description" />
					<meta property="og:url" content={url} key="url" />
					<meta property="og:image" content={imageUrl} key="image" />
					<meta name="twitter:card" content="summary_large_image" key="twitter:card" />
					<meta name="twitter:image" content={imageUrl} key="twitter:image" />
					<link rel="icon" href="/favicon.ico" />
				</Head>
				<Main
					data={this.props}
					setFullscreen={this._setFullscreen.bind(this)}
				/>
				<Fullscreener
					data={this.state.toFullscreen}
					setFullscreen={this._setFullscreen.bind(this)}
					setEventHandler={this._setEventHandler.bind(this)}
					setKeydownBlock={this._setKeydownBlock.bind(this)}
					keydownBlocks={this.state.keydownBlocks}
				/>
			</>
		)
	}
	
	componentDidMount(): void {
		try {
			window.addEventListener('checkingPassiveSupport', null, Object.defineProperty({}, 'passive', {
				get: () => {
					this._wheelOpt = { passive: false }
				}
			}))
		} catch(e) {}
		if ('onwheel' in document.createElement('div')) {
			this._wheelEvent = 'wheel'
		}
		setTimeout(() => {
			let onEventBind = this._onEvent.bind(this)
			window.addEventListener('keydown', onEventBind, true)
			window.addEventListener('DOMMouseScroll', onEventBind, true)
			window.addEventListener(this._wheelEvent, onEventBind, this._wheelOpt)
			window.addEventListener('contextmenu', onEventBind, { passive: false })
			window.addEventListener('mousedown', onEventBind, { passive: false })
			window.addEventListener('mousemove', onEventBind, { passive: true })
			window.addEventListener('mouseup', onEventBind, { passive: true })
			window.addEventListener('touchstart', onEventBind, { passive: false })
			window.addEventListener('touchend', onEventBind, { passive: false })
			window.addEventListener('touchcancel', onEventBind, { passive: false })
			window.addEventListener('touchmove', onEventBind, { passive: false })
		})
	}
}


import { GetStaticProps } from 'next'
const currentSda = (process.env.CURRENT_SDA ?? '') as string
export const getStaticProps: GetStaticProps = () => {
	let props: t.indexProps = {}
	try {
		let contacts = fs.readFileSync(currentSda + 'contacts.json')
		props.contacts = JSON.parse(contacts.toString())
		let passport = fs.readFileSync(currentSda + 'passport.json')
		props.passport = JSON.parse(passport.toString())
		let subsections = fs.readFileSync(currentSda + 'subsections.json')
		props.subsections = JSON.parse(subsections.toString())
		let data = fs.readFileSync(currentSda + 'stageSensitive/data.json')
		props.data = JSON.parse(data.toString())
	} catch (e) {}
	props.domain = process.env.DOMAIN as string
	props.anotherDomain = process.env.ANOTHER_DOMAIN as string
	return { props }
}