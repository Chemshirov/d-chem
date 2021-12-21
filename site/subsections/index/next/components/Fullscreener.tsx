import * as t from '../types/types'
import { Component } from 'react'
import NoteAtFullscreen from './NoteAtFullscreen'
import styles from '../styles/fullscreener.module.css'

export default class Fullscreener extends Component<t.fullscreenerProps, t.fullscreenerStats> {
	
	private _onKeydownCallback: false | NoteAtFullscreen['_onKeydown']
	private _wheelOpt: false | t.obj<boolean>
	private _wheelEvent: 'mousewheel' | 'wheel'
	
	constructor(props: t.fullscreenerProps) {
		super(props)
		this.state = {
			width: 0,
			height: 0,
		}
		this._wheelOpt = false
		this._wheelEvent = 'mousewheel'
		this._onKeydownCallback = false
	}
	
	private _preventDefault(event): void {
		event.preventDefault()
	}
	private _disableScroll(): void {
		window.addEventListener('DOMMouseScroll', this._preventDefault, false)
		window.addEventListener(this._wheelEvent, this._preventDefault, this._wheelOpt)
		window.addEventListener('touchmove', this._preventDefault, this._wheelOpt)
	}
	private _enableScroll(): void {
		window.removeEventListener('DOMMouseScroll', this._preventDefault, false)
		window.removeEventListener(this._wheelEvent, this._preventDefault, this._wheelOpt)
		window.removeEventListener('touchmove', this._preventDefault, this._wheelOpt)
	}
	
	private _onKeydown(event): void {
		if ([37, 38, 39, 40].includes(event.keyCode)) {
			this._preventDefault(event)
		}
		let hasBlocked = false
		if (typeof this._onKeydownCallback === 'function') {
			hasBlocked = this._onKeydownCallback(event)
		}
		if (!hasBlocked) {
			if (event.keyCode === 27) {
				this._onClose()
			}
		}
	}
	
	private _onKeydownToPropagate(callback): void {
		this._onKeydownCallback = callback
	}
	
	private _setSize(): void {
		let width = window.innerWidth
		let height = window.innerHeight
		let thisElement = document.querySelector('[class^=fullscreener]')
		if (thisElement && thisElement.clientWidth) {
			width = thisElement.clientWidth
			height = thisElement.clientHeight
		}
		this.setState({ width, height })
	}
	
	private _onClose(): void {
		this.props.setFullscreen(false)
		this._enableScroll()
	}
	
	render(): JSX.Element {
		let mainClassName = styles.main
		if (!this.props.data) {
			mainClassName += ' ' + styles.hide
		}
		
		if (this.props.data) {
			return (
				<div
					className={mainClassName}
				>
					<NoteAtFullscreen
						data={this.props.data}
						fullscreenWidth={this.state.width}
						fullscreenHeight={this.state.height}
						setKeydownCallback={this._onKeydownToPropagate.bind(this)}
					/>
					<button
						type='button'
						className={'button closeButton ' + styles.button}
						onClick={this._onClose.bind(this)}
					/>
				</div>
			)
		} else {
			return (
				<div
					className={mainClassName}
				/>
			)
		}
	}
	
	componentDidMount(): void {
		setTimeout(() => {
			window.addEventListener('resize', event => {
				this._setSize()
			}, true)
			window.addEventListener('keydown', event => {
				this._onKeydown(event)
			}, true)
		})
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
	}
	
	componentDidUpdate(prevProps, prevState): void {
		if (!prevProps.data) {
			this._disableScroll()
			if (!prevState.width) {
				this._setSize()
			}
		}
	}
}