import * as t from '../types/types'
import { Component } from 'react'
import styles from '../styles/noteAtFullscreen.module.css'

export default class NoteAtFullscreen extends Component<t.noteAtFullscreenProps, t.noteAtFullscreenStats> {
	constructor(props: t.noteAtFullscreenProps) {
		super(props)
		this.state = {
			showHeader: true,
		}
		this.props.setKeydownCallback(this._onKeydown.bind(this))
	}
	
	private _getInitialStyle(): t.obj<string> {
		let style: t.obj<string> = {}
		if (this.props.data) {
			let url = this.props.data.note.fileName
			style.backgroundImage = 'url(' + url + ')'
			if (this.props.data.anotherDomain) {
				style.backgroundImage = 'url("https://' + this.props.data.anotherDomain + url + '"), url("' + url + '")'
			}
			
			let imageAspect = this.props.data.note.width / this.props.data.note.height
			let viewportAspect = this.props.fullscreenWidth / this.props.fullscreenHeight
			let height = this.props.fullscreenWidth / imageAspect
			let width = this.props.fullscreenHeight * imageAspect
			style.backgroundSize = this.props.fullscreenWidth + 'px ' + height + 'px'
			style.backgroundPosition = '0px ' + ((this.props.fullscreenHeight - height) / 2) + 'px'
			if (imageAspect < viewportAspect) {
				style.backgroundSize = width + 'px ' + this.props.fullscreenHeight + 'px'
				style.backgroundPosition = ((this.props.fullscreenWidth - width) / 2) + 'px 0px'
			}
		}
		return style
	}
	
	private _onClose(): void {
		this.setState({ showHeader: false })
	}
	
	private _onReturnHeader(): void {
		this.setState({ showHeader: true })
	}
	
	private _onKeydown(event): boolean {
		if (event.keyCode === 27) {
			if (!this.state.showHeader) {
				this._onReturnHeader()
				return true
			}
		} else if (event.keyCode === 38) {
			this._onClose()
		} else if (event.keyCode === 40) {
			this._onReturnHeader()
		}
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
							className={'button ' + styles.download}
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
		let style = this._getInitialStyle()
		return (
			<div
				className={styles.wh100 + ' ' + styles.fullscreen}
			>
				<div
					className={styles.wh100 + ' ' + styles.image}
					style={style}
				/>
				{this._getHeader()}
			</div>
		)
	}
}