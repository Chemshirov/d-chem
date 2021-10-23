import { Component } from 'react'
import Login from '../components/Login'
import styles from '../styles/header.module.scss'

interface props {
	serverBlockNumber: number
}
class Header extends Component<props> {
	constructor(props: props) {
		super(props)
	}
	
	_getLoginOrLogout() {
		if (!this.props.isAdmin) {
			return (
				<Login
					serverBlockNumber={this.props.serverBlockNumber}
					passIsIncorrect={this.props.passIsIncorrect}
					loginMenuOpener={this.props.loginMenuOpener}
					emit={this.props.emit}
				/>
			)
		} else {
			return (
				<div
					className='link'
					onClick={this._onLogout.bind(this)}
				>
					Logout
				</div>
			)
		}
	}
	
	_onLogout() {
		this.props.emit({ type: 'logout' })
	}
	
	render() {
		let gridColumnStart = (this.props.serverBlockNumber || 1) * 2 - 1
		let gridColumnEnd = gridColumnStart + 2
		let gridColumn = gridColumnStart + ' / ' + gridColumnEnd
		let className = styles.title + ' hiddenLink'
		return (
			<div 
				className={styles.header}
				style={{ gridColumn }}
			>
				<div className='p1 textBetweener'>
					<div className={className}>
						Multiserver
					</div>
					{this._getLoginOrLogout()}
				</div>
			</div>
		)
	}
}

export default Header