import * as t from '../types/types'
import { Component } from 'react'
import Imager from './Imager'
import styles from '../styles/noteAtFullscreen.module.css'

export default class NoteAtFullscreen extends Component<t.noteAtFullscreenProps, t.noteAtFullscreenState> {
	private _onEventCallbacks: t.obj<t.eventHandler>
	
	constructor(props: t.noteAtFullscreenProps) {
		super(props)
		this.state = {
			showHeader: true,
		}
		this._onEventCallbacks = {}
	}
	
	private _onClose(): void {
		this.setState({ showHeader: false })
	}
	
	private _onReturnHeader(): void {
		this.setState({ showHeader: true })
	}
	
	private _onEvents(event): void {
		let onEvent = this._onEventCallbacks[event.type]
		if (typeof onEvent === 'function') {
			if (!['keydown', 'mousedown', 'mousemove', 'mouseup'].includes(event.type)) {
				event.preventDefault()
			}
			onEvent(event)
		}
		if (event.type === 'keydown') {
			if (event.keyCode === 27) {
				if (!this.state.showHeader) {
					this.props.setKeydownBlock(event.keyCode, this.constructor.name)
					this._onReturnHeader()
				} else {
					this.props.setKeydownBlock(event.keyCode)
				}
			} else if (event.keyCode === 38) {
				event.preventDefault()
				this._onClose()
			} else if (event.keyCode === 40) {
				event.preventDefault()
				this._onReturnHeader()
			}
		}
	}
	
	_setOnEventCallback(type, callback) {
		this._onEventCallbacks[type] = callback
	}
	
	private _onDownload(): void {
		if (this.props.data) {
			let imageUrl = this.props.data.note.fileName
			let a = document.createElement('a')
			a.href = imageUrl
			a.download = imageUrl.split('/').pop()
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
		}
	}
	
	private _getHeader(): JSX.Element {
		if (this.state.showHeader) {
			return (
				<div
					className={styles.header}
				>
					<div
						className={styles.headerArea}
					>
						<h3>
							{this.props.data ? this.props.data.note.title: ''}
						</h3>
						<button
							type="button"
							className={'button closeButton ' + styles.close}
							onClick={this._onClose.bind(this)}
						/>
						<button
							type="button"
							className={'button beforeCloseButton ' + styles.download}
							onClick={this._onDownload.bind(this)}
						/>
						<div>
							{this.props.data && this.props.data.note.text ? this.props.data.note.text : null}
						</div>
						<div className={styles.html}>
							{this._getHtml()}
						</div>
						<div className={styles.footer}>
							<div>
								{this._getGroups()}
							</div>
							<small>
								{this.props.data ? this.props.data.note.date.substring(0, 19) : ''}
							</small>
						</div>
					</div>
				</div>
			)
		} else {
			return (
				<div
					className={styles.hideHeader}
				>
					<button
						type="button"
						className={'button ' + styles.esc}
						onClick={this._onReturnHeader.bind(this)}
					/>
				</div>
			)
		}
	}
	
	private _getHtml(): JSX.Element | null {
		if (this.props.data && this.props.data.note.html) {
			return (
				<div 
					dangerouslySetInnerHTML={{ __html: this.props.data.note.html }}
				/>
			)
		} else {
			return null
		}
	}
	
	private _getGroups(): Array<JSX.Element> {
		let jsx = []
		if (this.props.data) {
			let array = Object.keys(this.props.data.note.groups)
			array.forEach((group, i) => {
				jsx.push(
					<span
						key={group}
					>
						<span>
							<a
								className='link'
								href={'/data/' + group}
							>
								{group}
							</a>
						</span>
						<span>{(i + 1) !== array.length ? ', ' : ''}</span>
					</span>
				)
			})
		}
		return jsx
	}
	
	render(): JSX.Element {
		let imageText = this.props.data.note.title
		if (this.props.data.note.text) {
			imageText += '. ' + this.props.data.note.text
		}
		return (
			<div
				className={styles.wh100 + ' ' + styles.fullscreen}
			>
				<Imager
					url={this.props.data.note.fileName}
					anotherDomain={this.props.data.anotherDomain}
					title={this.props.data.note.title}
					alt={imageText}
					frameWidth={this.props.fullscreenWidth}
					frameHeight={this.props.fullscreenHeight}
					imageWidth={this.props.data.note.width}
					imageHeight={this.props.data.note.height}
					setOnEventCallback={this._setOnEventCallback.bind(this)}
				/>
				{this._getHeader()}
			</div>
		)
	}
	
	componentDidMount(): void {
		this.props.setEventHandler('NoteAtFullscreen', this._onEvents.bind(this))
	}
	
	componentWillUnmount(): void {
		this.props.setEventHandler('NoteAtFullscreen', null)
	}
}