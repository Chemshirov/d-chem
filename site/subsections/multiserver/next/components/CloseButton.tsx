import * as t from '../types/types'
import { Component } from 'react'

type state = {
	mounted: boolean
}

class CloseButton extends Component<t.closeButtonProps, state> {
	private _onEscapeBound: t.func<t.event, void>
	private _onOuterClickBound: t.func<t.event, void>
	private _onWindowBlurBound: t.func<t.event, void>
	
	constructor(props: t.closeButtonProps) {
		super(props)
		this.state = {
			mounted: false
		}
		this._onEscapeBound = this._onEscape.bind(this)
		this._onOuterClickBound = this._onOuterClick.bind(this)
		this._onWindowBlurBound = this._onWindowBlur.bind(this)
		this._setListeners()
	}
	
	private _setListeners(): void {
		if (typeof navigator !== 'undefined') {
			document.addEventListener('keydown', this._onEscapeBound)
			document.addEventListener('click', this._onOuterClickBound)
			window.focus()
			window.addEventListener('blur', this._onWindowBlurBound)
		}
	}
	
	private _onEscape(event: t.event): void {
		if (this.state.mounted) {
			if (event.keyCode === 27) {
				this.props.onClose(event)
			}
		}
	}
	
	private _onOuterClick(event: t.event): void {
		if (this.state.mounted) {
			let classList = this.props.parentClasses.split(' ')
			let isOuter = false
			for (let i = 0; i < classList.length; i++) {
				let className = classList[i]
				if (!event.target.closest('.' + className)) {
					isOuter = true
					break
				}
			}
			if (isOuter) {
				this.props.onClose(event)
			}
		}
	}
	
	private _onWindowBlur(event: t.event): void {
		if (document.activeElement && document.activeElement.tagName) {
			if (document.activeElement.tagName.toLowerCase() === 'iframe') {
				this.props.onClose(event)
			}
		}
	}
	
	render(): JSX.Element {
		let className = 'closeButton'
		if (this.props.hidden) {
			className += ' hidden'
		}
		return (
			<div
				className={className}
				onClick={this.props.onClose}
			/>
		)
	}
	
	componentDidMount(): void {
		setTimeout(() => {
			this.setState({ mounted: true })
		}, 100)
	}
	
	componentWillUnmount(): void {
		this.setState({ mounted: false })
		document.removeEventListener('keydown', this._onEscapeBound)
		document.removeEventListener('click', this._onOuterClickBound)
		window.removeEventListener('blur', this._onWindowBlurBound)
	}
}

export default CloseButton