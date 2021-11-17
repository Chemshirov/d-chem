import * as t from '../types/types'
import CloseButton from './CloseButton'
import { Component, createRef, RefObject } from 'react'
import styles from '../styles/serverBlockButtons.module.scss'

interface buttonsState {
	restartOptionsHidden: boolean,
	clickless: boolean,
}
class ServerBlockButtons extends Component<t.serverBlockButtonsProps, buttonsState> {
	ref: RefObject<HTMLInputElement>
	
	constructor(props: t.serverBlockButtonsProps) {
		super(props)
		this.state = {
			restartOptionsHidden: true,
			clickless: false,
		}
		this.ref = createRef()
	}
	
	private _copyToAnotherServerOnClick(): void {
		this._emit('copyToAnotherServer')
		this._preventClicksForAwhile()
	}
	
	private _restartOnClick(): void {
		this.setState({
			restartOptionsHidden: !this.state.restartOptionsHidden
		})
	}
	
	restartContainerOnClick(hostname: string): void {
		this.setState({
			restartOptionsHidden: true
		})
		if (this.props.isAdmin) {
			this._emit('restartContainer', hostname)
			this._preventClicksForAwhile()
		} else {
			if (this.props.loginMenuOpener) {
				this.props.loginMenuOpener()
			}
		}
	}
	
	private _preventClicksForAwhile(): void {
		this.setState({
			clickless: true
		})
		setTimeout(() => {
			this.setState({
				clickless: false
			})
		}, 5000)
	}
	
	private _emit(type: string, value?: string): void {
		if (!this.state.clickless) {
			let domain = this.props.serverStaticProps['domain']
			let data: t.obj<string> = { type, domain }
			if (value) {
				data.value = value
			}
			this.props.emit(data)
		}
	}
	
	private _getCopyButton(): JSX.Element | null {
		if (this.props.role === 'master') {
			let className = 'link'
			if (this.props.buttonsState.copyToAnotherServer === 'hasReceived') {
				className += ' clicked'
			}
			return (
				<span className='noWrap'>
					<span
						className={className}
						onClick={this._copyToAnotherServerOnClick.bind(this)}
					>
						Copy to another server
					</span>
					<span className='buttonComma'>
						, 
					</span>
				</span>
			)
		} else {
			return null
		}
	}
	
	private _getMark(): JSX.Element | null {
		if (!this.state.restartOptionsHidden) {
			return (
				<small>
					&#x25BE;
				</small>
			)
		} else {
			return null
		}
	}
	
	private _onCloseButton(): void {
		this.setState({ restartOptionsHidden: true })
	}
	
	render(): JSX.Element {
		let restartClass = 'noWrap link ' + styles.restart
		return (
			<div className={styles.left}>
				{this._getCopyButton()}
				<div 
					className={restartClass}
					onClick={this._restartOnClick.bind(this)}
				>
					restart
					{this._getMark()}
					<RestartContainerList
						restartOptionsHidden={this.state.restartOptionsHidden}
						serverStaticProps={this.props.serverStaticProps}
						containers={this.props.containers}
						onClick={this.restartContainerOnClick.bind(this)}
					/>
					<CloseButton
						hidden={true}
						parentClasses={restartClass}
						onClose={this._onCloseButton.bind(this)}
					/>
				</div>
			</div>
		)
	}
}

interface restartContainerListProps {
	restartOptionsHidden: buttonsState['restartOptionsHidden'],
	serverStaticProps: t.serverBlockButtonsProps['serverStaticProps'],
	containers: t.serverBlockButtonsProps['containers'],
	onClick: ServerBlockButtons['restartContainerOnClick']
}
class RestartContainerList extends Component<restartContainerListProps> {
	constructor(props: restartContainerListProps) {
		super(props)
	}
	
	private _onClick(hostname): void {
		this.props.onClick(hostname)
	}
	
	private _onCloseButton(): void {
		
	}
	
	private _getRows(): Array<JSX.Element> {
		let jsx = []
		if (this.props.containers) {
			this.props.containers.forEach(hostname => {
				let name = this.props.serverStaticProps.Containers[hostname].name
				let Name = name.substring(0, 1).toUpperCase() + name.substring(1)
				jsx.push(this._getRow(hostname, Name))
			})
		}
		jsx.push(this._getRow('_all', 'All'))
		return jsx
	}
	
	private _getRow(hostname: string, name: string): JSX.Element {
		return (
			<li 
				key={hostname}
				className={styles.menuItem}
				onClick={this._onClick.bind(this, hostname)}
			>
				{name}
			</li>
		)
	}
	
	render(): JSX.Element {
		if (!this.props.restartOptionsHidden) {
			let className = 'restartMenu'
			return (
				<ul className={className}>
					<CloseButton
						parentClasses={className}
						onClose={this._onCloseButton.bind(this)}
					/>
					{this._getRows()}
				</ul>
			)
		} else {
			return null
		}
	}
}


export default ServerBlockButtons