import { Component } from 'react'
import { Button } from 'react-bootstrap'
import 'bootstrap/dist/css/bootstrap.css'

interface ScrollProps {
	fraction: number,
	onScroll: (fraction: number) => void,
	isGripTaken: boolean
}
interface ScrollState {
	gripHeight: number,
	scrollHeight: number
}
class Scroll extends Component<ScrollProps, ScrollState> {
	_mouseDown: boolean
	constructor(props: ScrollProps) {
		super(props)
		this.state = {
			gripHeight: 16,
			scrollHeight: 1000
		}
		this._setWindowMouseUp()
	}
	
	protected _onMouseDown(event) {
		this._mouseDown = true
	}
	
	protected _onMouseMove(event) {
		if (this._mouseDown) {
			this._scroll(event)
		}
	}
	
	protected _onMouseUp(event) {
		this._mouseDown = false
	}
	
	protected _onClick(event) {
		this._scroll(event)
	}
	
	protected _scroll(event) {
		let scrollDiv = event.target.closest('#scroll')
		let rect = scrollDiv.getBoundingClientRect()
		let y = event.clientY - rect.top
		let fraction = y / rect.height
		this.props.onScroll(fraction)
	}
	
	protected _setWindowMouseUp() {
		if (process.browser) {
			document.addEventListener('mouseup', this._onMouseUp.bind(this))
		}
	}
	
	protected _setHeights(element) {
		if (element) {
			let gripHeight = element.clientHeight
			let isIncorrectGrip = (gripHeight !== this.state.gripHeight)
			if (isIncorrectGrip) {
				this.setState({ gripHeight })
			}
			let scrollHeight = element.closest('#scroll').clientHeight
			let isIncorrectScroll = (scrollHeight !== this.state.scrollHeight)
			if (isIncorrectScroll) {
				this.setState({ scrollHeight })
			}
		}
	}
	
	render() {
		let fraction = this.props.fraction
		if (fraction < 0) {
			fraction = 0
		}
		let effectiveHeight = (this.state.scrollHeight - this.state.gripHeight)
		let top = fraction * effectiveHeight
		interface style {
			top: number | string,
			left?: number | string,
		}
		let style: style = { top }
		let gripStyle = {}
		if (this.props.isGripTaken) {
			gripStyle = { boxShadow: "0.2em 0 0.2em grey" }
			style.left = "-0.2em"
		}
		return (
			<div
				id="scroll"
				className="d-flex h-100 position-relative"
				onClick={this._onClick.bind(this)}
				onMouseMove={this._onMouseMove.bind(this)}
			>
				<div className="d-flex h-100 p-2">
					<div className="d-flex h-100 mx-1 px-1 alert-secondary">
					</div>
				</div>
				<div
					className="d-flex position-absolute"
					style={style}
					onMouseDown={this._onMouseDown.bind(this)}
				>
					<div
						id="grip"
						className="d-flex p-2 mx-2 rounded-circle bg-secondary" 
						role="button"
						style={gripStyle}
						ref={this._setHeights.bind(this)}
					>
					</div>
				</div>
			</div>
		)
	}
}

export default Scroll