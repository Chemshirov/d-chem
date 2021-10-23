import { Component } from 'react'
import ReactDOM from 'react-dom'

interface props {
	onClose: (() => void)
}
class CloseButton extends Component<props> {
	constructor(props: props) {
		super(props)
		this.state = {
			mounted: false
		}
		this._onEscapeBound = this._onEscape.bind(this)
		this._onOuterClickBinder = this._onOuterClick.bind(this)
		this._onWindowBlurBinder = this._onWindowBlur.bind(this)
		this._setListeners()
	}
	
	_setListeners() {
		if (process.browser) {
			document.addEventListener('keydown', this._onEscapeBound)
			document.addEventListener('click', this._onOuterClickBinder)
			window.focus()
			window.addEventListener('blur', this._onWindowBlurBinder)
		}
	}
	
	_onEscape(event) {
		if (this.state.mounted) {
			if (event.keyCode === 27) {
				this.props.onClose()
			}
		}
	}
	
	_onOuterClick(event) {
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
				this.props.onClose()
			}
		}
	}
	
	_onWindowBlur() {
		if (document.activeElement && document.activeElement.tagName) {
			if (document.activeElement.tagName.toLowerCase() === 'iframe') {
				this.props.onClose()
			}
		}
	}
	
	render() {
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
	
	componentDidMount() {
		setTimeout(() => {
			this.setState({ mounted: true })
		}, 100)
	}
	
	componentWillUnmount() {
		this.setState({ mounted: false })
		document.removeEventListener('keydown', this._onEscapeBound)
		document.removeEventListener('click', this._onOuterClickBinder)
		window.removeEventListener('blur', this._onWindowBlurBinder)
	}
}

export default CloseButton