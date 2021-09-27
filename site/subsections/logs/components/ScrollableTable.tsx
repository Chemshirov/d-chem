import { Component } from 'react'
import Scroll from './Scroll'
import Table from './Table'
import 'bootstrap/dist/css/bootstrap.css'

interface ScrollTableProps {
	list: object,
	showLabel: string
}
interface ScrollTableState {
	scroll: number,
	maxScroll: number,
	fraction: number,
	isGripTaken: boolean,
}
interface Rect {
	top: number,
	height: number
}
class ScrollableTable extends Component<ScrollTableProps, ScrollTableState> {
	_touchStartY: number | false
	_touchLastY: number | false
	_scrollDivRect: Rect | false
	_gripDivRect: Rect | false
	_scrollTouchMoveStopST: ReturnType<typeof setTimeout> = setTimeout(() => {}, 0)
	_lastMinus: number
	_lastPlus: number
	_lastTouchMove: number
	_inc: number
	constructor(props: ScrollTableProps) {
		super(props)
		this.state = this._getInitialDate()
		this._setTouchEvents()
	}
	
	protected _getInitialDate() {
		return {
			scroll: 0,
			maxScroll: Object.keys(this.props.list).length,
			fraction: 0,
			isGripTaken: false
		}
	}
	
	componentDidUpdate(prevProps) {
		if(prevProps.showLabel !== this.props.showLabel) {
			this.setState(this._getInitialDate())
		}
	}
	
	render() {
		return (
			<div 
				className="d-flex w-100 h-100"
				onWheel={this._onWheel.bind(this)}
			>
				<div 
					className="d-flex flex-grow-1 justify-content-center pl-1"
				>
					<Table
						list={this.props.list}
						offset={this.state.scroll}
					/>
				</div>
				<Scroll
					fraction={this.state.fraction}
					onScroll={this._onScroll.bind(this)}
					isGripTaken={this.state.isGripTaken}
				/>
			</div>
		)
	}
	
	protected _onTouchStart(event) {
		let target = event.target
		if (!target.closest('button') && !target.closest('[role="button"]')) {
			event.preventDefault()
			target.addEventListener("touchmove", this._onTouchMove.bind(this), { passive: false })
			target.addEventListener("touchend", this._onTouchEnd.bind(this), { passive: false })
			if (event.touches && event.touches[0]) {
				this._touchStartY = event.touches[0].clientY
				this._takeGrip(target)
			} else {
				this._touchStartY = false
			}
		} else {
			this._scrollDivRect = false
		}
	}
	
	protected _onTouchMove(event) {
		event.preventDefault()
		if (event.changedTouches && event.changedTouches[0]) {
			let touchEndY = event.changedTouches[0].clientY
			let target = event.target
			let gripDiv = target.closest('#grip')
			if (gripDiv || this.state.isGripTaken) {
				this._takeGrip(target)
				this._moveGrip(gripDiv, touchEndY)
			} else {
				this._tableTouchMove(touchEndY)
			}
		}
	}
	
	protected _onTouchEnd(event) {
		event.preventDefault()
		this._touchLastY = false
		let target = event.target
		target.removeEventListener("touchmove", this._onTouchMove.bind(this))
		target.removeEventListener("touchend", this._onTouchEnd.bind(this))
		this._takeGripBack()
	}
	
	protected _onWheel(event) {
		let isDirectionToTop = (event.deltaY >= 0)
		this._scrollIncrement(isDirectionToTop)
	}
	
	protected _onScroll(fraction) {
		let scroll = this.state.maxScroll * fraction
		this._setNewScrollAndFraction(scroll)
	}
	
	protected _setTouchEvents() {
		if (process.browser) {
			document.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false })
		}
	}
	
	protected _tableTouchMove(y) {
		if (this._touchStartY || this._touchLastY) {
			let difference: number = (this._touchLastY as number || this._touchStartY as number) - y
			if (Math.abs(difference) > 50) {
				this._touchLastY = y
				let isDirectionToTop = (difference >= 0)
				this._thinning(() => {
					this._scrollIncrement(isDirectionToTop)
				})
			}
		}
	}
	
	protected _moveGrip(gripDiv, y) {
		if (this._scrollDivRect && this._gripDivRect) {
			let relativeHeight = y - this._scrollDivRect.top
			let fraction = relativeHeight / this._scrollDivRect.height
			if (fraction > 0) {
				if (fraction < 1 / 20) {
					fraction = 0
				}
				let effectiveHeight = (this._scrollDivRect.height - this._gripDivRect.height)
				let top = fraction * effectiveHeight
				if (gripDiv) {
					gripDiv.parentElement.style.top = top + 'px'
				}
				this._thinning(() => {
					let scroll = fraction * this.state.maxScroll
					this._setNewScrollAndFraction(scroll)
				})
			}
		}
	}
	
	protected _takeGrip(target) {
		if (target.closest('#scroll')) {
			if (!this._scrollDivRect) {
				this._scrollDivRect = target.closest('#scroll').getBoundingClientRect()
				let gripDiv = target.closest('#grip')
				if (gripDiv) {
					this._gripDivRect = gripDiv.getBoundingClientRect()
				}
			}
			this.setState({
				isGripTaken: true
			})
			if (this._scrollTouchMoveStopST) {
				clearTimeout(this._scrollTouchMoveStopST)
			}
			this._scrollTouchMoveStopST = setTimeout(() => {
				this._takeGripBack()
			}, 5000)
		}
	}
	
	protected _takeGripBack() {
		this.setState({
			isGripTaken: false
		})
	}
	
	protected _scrollIncrement(isDirectionToTop) {
		let now = Date.now()
		let lastDate = this._lastMinus || this._lastPlus || 0
		if ((now - lastDate) < 400) {
			if (!this._inc) {
				this._inc = 1
			}
			this._inc++
		} else {
			this._inc = 1
		}
		let newScroll = this.state.scroll + this._inc
		if (!isDirectionToTop) {
			newScroll = this.state.scroll - this._inc
		}
		this._setNewScrollAndFraction(newScroll)
		this._lastMinus = (!isDirectionToTop ? now : 0)
		this._lastPlus = (isDirectionToTop ? now : 0)
	}
	
	protected _correctScroll(scroll) {
		let newScroll = Math.floor(scroll)
		if (newScroll < 0) {
			newScroll = 0
		}
		if (newScroll > this.state.maxScroll) {
			newScroll = this.state.maxScroll
		}
		return newScroll
	}
	
	protected _setNewScrollAndFraction(scroll) {
		let newScroll = this._correctScroll(scroll)
		this.setState({
			scroll: newScroll,
			fraction: newScroll / this.state.maxScroll
		})
	}
	
	protected _thinning(func) {
		let now = Date.now()
		let lastDate = this._lastTouchMove || 0
		if ((now - lastDate) > 150) {
			func()
		}
		this._lastTouchMove = lastDate
	}
}

export default ScrollableTable