import * as t from '../types/types'
import * as fs from 'fs'
import { Component } from 'react'
import Head from 'next/head'

import Fullscreener from '../components/Fullscreener'
import Main from '../components/Main.index'

export default class Index extends Component<t.indexProps, t.indexState> {
	private readonly label: string
	
	constructor(props: t.indexProps) {
		super(props)
		this.state = {
			toFullscreen: false,
		}
		this.label = 'Index'
	}
	
	private _setFullscreen(toFullscreen): void {
		// if (JSON.stringify(this.state.toFullscreen) !== JSON.stringify(toFullscreen)) { //
			this.setState({ toFullscreen })
		// }
	}
	
	render(): JSX.Element {
		let title = this.props.passport.name + ' ' + this.props.passport.surname + "'s site"
		let contact = this.props.contacts.Telegram
		let description = 'Write me to Telegram: ' + contact
		let url = 'https://' + this.props.domain + '/'
		let imageUrl = url + this.label.toLowerCase() + '/ogImage.png'
		return (
			<>
				<Head>
					<title>
						{title}
					</title>
					<meta name="viewport" content="initial-scale=0.5, width=device-width, user-scalable=no" />
					<meta name="description" content={description} />
					<meta property="og:type" content="website" key="type" />
					<meta property="og:site_name" content={this.props.domain} key="siteName" />
					<meta property="og:title" content={title} key="title" />
					<meta property="og:description" content={description} key="description" />
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
				/>
			</>
		)
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