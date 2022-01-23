import * as t from '../types/types'
import { Component } from 'react'
import NoteAtFullscreen from './NoteAtFullscreen'
import styles from '../styles/fullscreener.module.css'

export default class Fullscreener extends Component<t.fullscreenerProps, t.fullscreenerState> {
	private _wheelOpt: false | t.obj<boolean>
	private _wheelEvent: 'mousewheel' | 'wheel'
	
	constructor(props: t.fullscreenerProps) {
		super(props)
		this.state = {
			width: 0,
			height: 0,
		}
	}
	
	private _onEvents(event): void {
		if (event.keyCode === 27) {
			let blockerName = this.props.keydownBlocks[event.keyCode]
			if (!(blockerName && blockerName !== this.constructor.name)) {
				this._onClose()
			}
		}
	}
	
	private _setSize(): void {
		let width = window.innerWidth
		let height = document.documentElement.clientHeight
		let thisElement = document.querySelector('[class^=fullscreener]')
		if (thisElement && thisElement.clientWidth) {
			width = thisElement.clientWidth
		}
		if (navigator && (navigator.platform === 'iPhone' || navigator.platform === 'iPod')) {
			if (navigator.userAgent.includes('Safari') && navigator.userAgent.includes('iPhone OS 15')) {
				if (width < height) {
					height = height * 1.12
				}
			}
		}
		document.documentElement.style.setProperty('--vh', `${height / 100}px`);
		this.setState({ width, height })
	}
	
	private _onClose(): void {
		this.props.setFullscreen(false)
		this.props.setEventHandler(this.constructor.name, null)
		this._keydownBlockClear()
	}
	
	private _keydownBlockClear(): void {
		let initiators = [this.constructor.name, 'NoteAtFullscreen']
		let keydowns = Object.keys(this.props.keydownBlocks)
		keydowns.forEach(keyCode => {
			let initiator = this.props.keydownBlocks[keyCode]
			if (initiators.includes(initiator)) {
				this.props.setKeydownBlock(keyCode)
			}
		})
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
						setEventHandler={this.props.setEventHandler}
						setKeydownBlock={this.props.setKeydownBlock}
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
		})
	}
	
	componentDidUpdate(prevProps, prevState): void {
		if (!prevProps.data) {
			if (this.props.data) {
				this.props.setEventHandler('Fullscreener', this._onEvents.bind(this))
			}
			if (!prevState.width) {
				this._setSize()
			}
		}
	}
}