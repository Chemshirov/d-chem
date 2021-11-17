import * as t from '../types/types'
import CloseButton from './CloseButton'
import { Component, createRef, RefObject } from 'react'
import ReactDOM from 'react-dom'
import styles from '../styles/login.module.scss'

class Login extends Component<t.loginProps, t.obj<boolean>> {
	private inputRef: RefObject<HTMLInputElement>
	
	constructor(props: t.loginProps) {
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
		this.inputRef = createRef()
	}
	
	private _showMenu(): void {
		this.setState({ menu: true })
	}
	
	private _onCloseButton(): void {
		this.setState({ menu: false })
	}
	
	private _askForPermission(): void {
		this.props.emit({ type: 'askForPermission' })
		this.setState({ askForPermission: true })
	}
	
	private _onPasswordKeyDown(event: t.event): void {
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
	
	private _getAskForPermissionLine(): JSX.Element {
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
	
	private _getMenu(): JSX.Element | null {
		if (this.state.menu) {
			let menuClass = 'loginMenu'
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
								disabled={this.state.passwordHasSet}
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
	
	render(): JSX.Element {
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
	
	componentDidUpdate(prevProps: t.loginProps, prevState: t.obj<boolean>) {
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