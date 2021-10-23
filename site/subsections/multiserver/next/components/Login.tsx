import CloseButton from './CloseButton'
import { Component, createRef } from 'react'
import ReactDOM from 'react-dom'
import styles from '../styles/login.module.scss'

interface props {
}
class Login extends Component<props> {
	constructor(props: props) {
		super(props)
		this.state = {
			menu: false,
			passwordHadBeenTried: false,
			passwordHasSet: false,
			passIsIncorrect: false,
			askForPermission: false
		}
		if (this.props.loginMenuOpener) {
			this.props.loginMenuOpener(this._showMenu.bind(this))
		}
		if (this.props.waitingAdminForLogin) {
			this.state.askForPermission = true
		}
		this.inputRef = createRef()
	}
	
	_showMenu() {
		this.setState({ menu: true })
	}
	
	_onCloseButton() {
		this.setState({ menu: false })
	}
	
	_askForPermission() {
		this.props.emit({ type: 'askForPermission' })
		this.setState({ askForPermission: true })
	}
	
	_onPasswordKeyDown(event) {
		this.setState({ passIsIncorrect: false })
		if (event.keyCode === 13) {
			this.setState({ 
				passwordHasSet: true,
				passwordHadBeenTried: true,
			})
			let pass = event.target.value
			let type = 'pass'
			let value = event.target.value
			this.props.emit({ type, value })
		}
	}
	
	_getAskForPermissionLine() {
		if (!this.state.askForPermission) {
			return (
				<div
					className={styles.ask + ' link'}
					onClick={this._askForPermission.bind(this)}
				>
					Or ask admin for permission
				</div>
			)
		} else {
			return (
				<div
					className={styles.ask}
				>
					Waiting admin for login
				</div>
			)
		}
	}
	
	_getMenu() {
		if (this.state.menu) {
			let menuClass = styles.menu
			if (this.props.serverBlockNumber >= 4) {
				menuClass += ' ' + styles.right
			}
			let passIsIncorrectClass = 'hidden'
			if (this.state.passIsIncorrect && this.state.passwordHadBeenTried) {
				passIsIncorrectClass = styles.passIsIncorrect
			}
			return (
				<div className={menuClass}>
					<div className={styles.passLine}>
						<div className={styles.passWord}>
							Password
						</div>
						<div>
							<input
								type='password'
								ref={this.inputRef}
								autoFocus
								className={styles.input}
								onKeyDown={this._onPasswordKeyDown.bind(this)}
								disabled={this.state.passwordHasSet ? 'disabled' : null}
							/>
						</div>
					</div>
					<div className={passIsIncorrectClass}>
						<small>
							Password is incorrect
						</small>
					</div>
					{this._getAskForPermissionLine()}
					<CloseButton
						parentClasses={menuClass}
						onClose={this._onCloseButton.bind(this)}
					/>
				</div>
			)
		} else {
			return null
		}
	}
	
	render() {
		let className = styles.floatRight + ' link'
		return (
			<div className={className}>
				<span
					onClick={this._showMenu.bind(this)}
				>
					Login
				</span>
				{this._getMenu()}
			</div>
		)
	}
	
	componentDidUpdate(prevProps, prevState) {
		if (this.props.passIsIncorrect && prevProps.passIsIncorrect !== this.props.passIsIncorrect) {
			this.setState({ passIsIncorrect: true })
			setTimeout(() => {
				this.setState({ passwordHasSet: false })
			}, 1000)
			if (this.inputRef.current) {
				setTimeout(() => {
					this.inputRef.current.value = ''
					this.inputRef.current.focus()
				}, 1500)
			}
		}
	}
}

export default Login