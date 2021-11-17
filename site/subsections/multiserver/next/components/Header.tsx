import * as t from '../types/types'
import { Component } from 'react'
import Login from '../components/Login'
import styles from '../styles/header.module.scss'

class Header extends Component<t.headerProps> {
	constructor(props: t.headerProps) {
		super(props)
	}
	
	private _getLoginOrLogout(): JSX.Element {
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
	
	private _onLogout(): void {
		this.props.emit({ type: 'logout' })
	}
	
	render(): JSX.Element {
		let className = styles.header + ' headerGridColumn-' + this.props.serverBlockNumber
		return (
			<div 
				className={className}
			>
				<div>
					<div className={styles.title + ' hiddenLink'}>
						Multiserver
					</div>
					{this._getLoginOrLogout()}
				</div>
			</div>
		)
	}
}

export default Header