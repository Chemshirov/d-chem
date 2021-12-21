import * as t from '../types/types'
import { Component } from 'react'
import fs from 'fs'
import Head from 'next/head'
import styles from '../styles/passport.module.css'

export default class Passport extends Component<t.passportProps> {
	private readonly label: string
	
	constructor(props: t.passportProps) {
		super(props)
		this.label = 'Passport'
	}
	
	private _setVh(): void {
		document.documentElement.style.setProperty('--vh', `${window.innerHeight/100}px`)
	}
	
	render(): JSX.Element {
		let title = this.label
		let description = this.props.name + ' ' + this.props.surname + "'s passport"
		let url = 'https://' + this.props.domain + '/' + this.label.toLowerCase()
		let imageUrl = url + '/passport.jpg'
		let nameString = this.props.name + ' ' + this.props.surname + ', ' + this.props.dateOfBirth
		let issueString = this.props.dateOfIssue + ' - ' + this.props.dateOfExpiry + ', ' + this.props.authority
		let style = {
			backgroundImage: `url(${imageUrl})`
		}
		return (
			<>
				<Head>
					<title>
						{title}
					</title>
					<meta name="viewport" content="initial-scale=1.0, width=device-width, user-scalable=no" />
					<meta name="description" content={description} />
					<meta name="format-detection" content="telephone=no" />
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
				<div className={styles.main}>
					<h2>
						{this.props.passportNo}
					</h2>
					<div className={styles.text}>
						<div className={styles.string}>
							{nameString}
						</div>
						<div className={styles.string}>
							{issueString}
						</div>
					</div>
					<div className={styles.image} style={style} />
				</div>
			</>
		)
	}
	
	componentDidMount(): void {
		this._setVh()
	}
}

import { GetStaticProps } from 'next'
const currentSda = (process.env.CURRENT_SDA ?? '') as string
const jsonFile = currentSda + 'passport.json'
export const getStaticProps: GetStaticProps = () => {
	let props: t.passportProps = {}
	try {
		let data = fs.readFileSync(jsonFile)
		props = JSON.parse(data.toString())
	} catch (e) {}
	props.domain = process.env.DOMAIN as string
	return { props }
}