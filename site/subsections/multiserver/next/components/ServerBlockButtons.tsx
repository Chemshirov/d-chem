import CloseButton from './CloseButton'
import { Component, createRef } from 'react'
import styles from '../styles/serverBlockButtons.module.scss'

interface buttonsState {
	restartOptionsHidden: boolean,
	clickless: boolean,
}
class ServerBlockButtons extends Component<props, buttonsState> {
	constructor(props: props) {
		super(props)
		this.state = {
			restartOptionsHidden: true,
			clickless: false,
		}
		this.ref = createRef()
	}
	
	_copyToAnotherServerOnClick() {
		this._emit('copyToAnotherServer')
		this._preventClicksForAwhile()
	}
	
	_restartOnClick() {
		this.setState({
			restartOptionsHidden: !this.state.restartOptionsHidden
		})
	}
	
	_restartContainerOnClick(hostname) {
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
	
	_preventClicksForAwhile() {
		this.setState({
			clickless: true
		})
		setTimeout(() => {
			this.setState({
				clickless: false
			})
		}, 5000)
	}
	
	_emit(type, value) {
		if (!this.state.clickless) {
			let domain = this.props.serverStaticProps['domain']
			let data = { type, domain }
			if (value) {
				data.value = value
			}
			this.props.emit(data)
		}
	}
	
	_getCopyButton() {
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
	
	_getMark() {
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
	
	_onCloseButton() {
		this.setState({ restartOptionsHidden: true })
	}
	
	render() {
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
						onClick={this._restartContainerOnClick.bind(this)}
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

interface RestartContainerListProps {
	restartOptionsHidden: boolean,
	containers: containers,
	onClick: ((hostname: string) => void)
}
class RestartContainerList extends Component<RestartContainerListProps> {
	constructor(props: RestartContainerListProps) {
		super(props)
	}
	
	_onClick(hostname) {
		this.props.onClick(hostname)
	}
	
	_onCloseButton() {
		console.log(1)
	}
	
	_getRows() {
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
	
	_getRow(hostname, name) {
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
	
	render() {
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