import * as t from '../types/types'
import { Component } from 'react'
import styles from '../styles/image.module.css'

export default class Imager extends Component<t.imageProps, t.imageState> {
	private _mediumSize: number
	private _zoom: number
	private _zoomMax: number
	private _moveImageLimit: number
	private _protocolString: string
	private _interTouchWait: number
	private _doubleTouchDate: number
	private _mousedown: false | [number, number]
	private _mousemove: boolean
	private _lastMouseMove:  false | [number, number]
	private _touchStart: false | [number, number, number]
	
	constructor(props: t.imageProps) {
		super(props)
		
		this._mediumSize = 1000
		this._zoom = 1.1
		this._zoomMax = 5
		this._moveImageLimit = 1 / 2
		this._protocolString = 'https://'
		this._interTouchWait = 500
		this._doubleTouchDate = 0
		
		this.state = {
			mediumImageSrc: null,
			mediumImageWidth: 0,
			mediumImageHeight: 0,
			bigImageSrc: null,
			top: 0,
			left: 0,
			width: 0,
			height: 0,
			scale: 1,
			translateY: 0,
			translateX: 0,
		}
		
		this._clearMouseData()
		
		this.props.setOnEventCallback('wheel', this._onWheel.bind(this))
		this.props.setOnEventCallback('mousewheel', this._onWheel.bind(this))
		this.props.setOnEventCallback('keydown', this._onKeydown.bind(this))
		this.props.setOnEventCallback('contextmenu', event => event.preventDefault())
		this.props.setOnEventCallback('mousedown', this._onMouse.bind(this))
		this.props.setOnEventCallback('mousemove', this._onMouse.bind(this))
		this.props.setOnEventCallback('mouseup', this._onMouse.bind(this))
		this.props.setOnEventCallback('touchstart', this._onTouch.bind(this))
		this.props.setOnEventCallback('touchend', this._onTouch.bind(this))
		this.props.setOnEventCallback('touchcancel', this._onTouch.bind(this))
		this.props.setOnEventCallback('touchmove', this._onTouch.bind(this))
		
		this._mousedown = false
		this._mousemove = false
		this._lastMouseMove = false
		this._touchStart = false
	}
	
	private _onWheel(event): void {
		if (this._isOnTarget(event)) {
			this._changeImage(event.clientX, event.clientY, event.deltaY > 0)
		}
	}
	
	private _onKeydown(event): void {
		if ((event.keyCode === 187 && event.shiftKey) || event.keyCode === 107) {
			this._scaleImage(false)
		} else if ((event.keyCode === 189 && event.shiftKey) || event.keyCode === 109) {
			this._scaleImage(true)
		}
	}
	
	private _onMouse(event, noPrevent): void {
		if (this._isOnTarget(event)) {
			if (event.type === 'mousedown') {
				if (!noPrevent) {
					event.preventDefault()
				}
				this._mousedown = [event.clientX, event.clientY]
				this._mousemove = false
			} else if (event.type === 'mousemove') {
				this._mousemove = true
				this._moveImage(event.clientX, event.clientY)
			} else if (event.type === 'mouseup') {
				let mousedown = this._mousedown
				let mousemove = this._mousemove
				this._clearMouseData()
				if (!mousemove) {
					this._changeImage(event.clientX, event.clientY, (event.which === 3), 1.5)
				} else {
					// this._swipe(mousedown, [event.offsetX, event.offsetY])
				}
			}
		} else {
			this._clearMouseData()
		}
	}
	
	private _clearMouseData(): void {
		this._mousedown = false
		this._mousemove = false
		this._lastMouseMove = false
	}
	
	private _onTouch(event): void {
		if (this._isOnTarget(event)) {
			event.preventDefault()
			if (event.touches) {
				if (event.touches.length <= 1) {
					if ((Date.now() - this._doubleTouchDate) > this._interTouchWait) {
						let newType = event.type.replace('touchstart', 'mousedown').replace('touchmove', 'mousemove')
							newType = newType.replace('touchcancel', 'mouseup').replace('touchend', 'mouseup')
						let touchSpot = event.touches[0]
						if (!touchSpot) {
							if (event.changedTouches) {
								touchSpot = event.changedTouches[0]
							}
						}
						let newEvent = {
							target: event.target,
							type: newType,
							clientX: touchSpot.clientX,
							clientY: touchSpot.clientY,
						}
						this._onMouse(newEvent, true)
					}
				} else if (event.touches.length >= 2) {
					this._doubleTouchDate = Date.now()
					if (event.type === 'touchstart') {
						let finger1 = event.touches[0]
						let finger2 = event.touches[1]
						let clientX = (finger1.clientX + finger2.clientX) / 2
						let clientY = (finger1.clientY + finger2.clientY) / 2
						let rangeX = Math.abs(finger1.clientX - finger2.clientX)
						let rangeY = Math.abs(finger1.clientY - finger2.clientY)
						let touchHyp = Math.sqrt(Math.pow(rangeX, 2) + Math.pow(rangeY, 2))
						this._touchStart = [clientX, clientY, touchHyp]
					} else if (event.type === 'touchmove') {
						if (this._touchStart) {
							let [clientX, clientY, touchHyp] = this._touchStart
							let finger1 = event.touches[0]
							let finger2 = event.touches[1]
							let rangeX = Math.abs(finger1.clientX - finger2.clientX)
							let rangeY = Math.abs(finger1.clientY - finger2.clientY)
							let touchHypNow = Math.sqrt(Math.pow(rangeX, 2) + Math.pow(rangeY, 2))
							this._changeImage(clientX, clientY, touchHypNow < touchHyp, 0.95)
						}
					} else if (event.type === 'touchend') {
						this._touchStart = false
					}
				}
			}
		} else {
			this._clearMouseData()
			event.target.click()
		}
	}
	
	private _isOnTarget(event): boolean {
		let className = event.target.className
		let isImage = className.includes('image_img_')
		let isFullscreen = className.includes('noteAtFullscreen_fullscreen_')
		let isHeader = className.includes('noteAtFullscreen_header_')
		return (isImage || isFullscreen || isHeader)
	}
	
	private _changeImage(clientX, clientY, reduce, multiply?): void {
		let scale = this._getImageScale(reduce, multiply)
		let { translateTo: translateX } = this._getTranslateOnScale(clientX, scale, false)
		let { translateTo: translateY } = this._getTranslateOnScale(clientY, scale, true)
		if (scale === 1) {
			translateX = 0
			translateY = 0
		}
		this.setState({ scale, translateX, translateY })
	}
	
	private _scaleImage(reduce): void {
		let scale = this._getImageScale(reduce)
		this.setState({ scale })
	}
	
	private _getImageScale(reduce, multiply?): number {
		let zoom = this._zoom * (multiply ? multiply : 1)
		if (reduce) {
			zoom = 1 / zoom
		}
		let scale = Math.round(this.state.scale * zoom * 100) / 100
		if (scale <= 1) {
			scale = 1
		}
		if (scale > this._zoomMax) {
			scale = this._zoomMax
		}
		return scale
	}
	
	private _moveImage(clientX, clientY): void {
		if (this._mousedown && this._mousemove) {
			if (this.state.scale > 1) {
				let [lastX, lastY] = this._mousedown
				if (this._lastMouseMove) {
					[lastX, lastY] = this._lastMouseMove
				}
				let shiftX = Math.round( (clientX - lastX) / this.state.scale )
				let shiftY = Math.round( (clientY - lastY) / this.state.scale )
				if (Math.abs(shiftX) > 1 || Math.abs(shiftY) > 1) {
					let translateX = this.state.translateX + shiftX
					let translateY = this.state.translateY + shiftY
					
					let limit = this._moveImageLimit
					let translateToX = this._getTranslateOnScale(clientX, this.state.scale, false)
					let isTooLeft = (translateToX.blankRight > translateToX.frameSize * limit) && shiftX < 0
					let isTooRight = (translateToX.blankLeft > translateToX.frameSize * limit) && shiftX > 0
					let translateToY = this._getTranslateOnScale(clientY, this.state.scale, true)
					let isTooTop = (translateToY.blankRight > translateToY.frameSize * limit) && shiftY < 0
					let isTooBottom = (translateToY.blankLeft > translateToY.frameSize * limit) && shiftY > 0
					
					if (!isTooLeft && !isTooRight && !isTooTop && !isTooBottom) {
						this.setState({ translateX, translateY })
						this._lastMouseMove = [clientX, clientY]
					}
				}
			}
		}
	}
	
	private _getTranslateOnScale(coordinate, scale, isHeight) {
		let translateTo = 0
		
		let translateX = this.state.translateX
		let left = this.state.left
		let dimentionName = 'Width'
		if (isHeight) {
			dimentionName = 'Height'
			translateX = this.state.translateY
			left = this.state.top
		}
		let firstSize = this.state[dimentionName.toLowerCase()]
		let frameSize = this.props['frame' + dimentionName]
		
		let lastScaleLeft = (this.state.scale * firstSize - frameSize) / 2
		let lasttranslateX = translateX * this.state.scale * -1
		let imageX = (coordinate + lastScaleLeft + lasttranslateX) * scale / this.state.scale
		let imageWidth = scale * firstSize
		let scaleLeft = ((imageWidth - frameSize) / 2)
		let toLeft = (imageX - coordinate - scaleLeft) * -1
		translateTo = toLeft / scale
		
		let blankLeft = (toLeft - scaleLeft)
		let blankRight = (frameSize - (imageWidth - scaleLeft + toLeft))
		if (frameSize > imageWidth) {
			blankLeft += scaleLeft
			blankRight += scaleLeft
		}
		
		if (Math.abs(translateTo) < 1 / 2) {
			translateTo = 0
		} else if (scale === 1 && left) {
			translateTo = 0
		} else {
			if (!left) {
				if (blankLeft > 0) {
					translateTo = ((scaleLeft + left) / scale)
				}
				if (blankRight > 0 && frameSize < imageWidth) {
					translateTo = translateTo + ((blankRight + left) / scale)
				}
			}
		}
		
		return { translateTo, blankLeft, blankRight, frameSize, imageWidth }
	}
	
	private _loadImages(): void {
		this._setMedium()
		setTimeout(async () => {
			let isMediumOk = await this._loadImage(true)
			if (isMediumOk) {
				this._fitToFrame()
			}
			let isBigOk = await this._loadImage()
			if (isBigOk) {
				this.setState({ mediumImageSrc: null })
			}
		})
	}
	
	private _setMedium(): void {
		if (this.props.imageWidth) {
			let mediumImageWidth, mediumImageHeight
			let aspect = this.props.imageWidth / this.props.imageHeight
			if (this.props.imageWidth > this.props.imageHeight) {
				mediumImageWidth = this._mediumSize
				mediumImageHeight = Math.round(this._mediumSize / aspect)
			} else {
				mediumImageWidth = Math.round(this._mediumSize * aspect)
				mediumImageHeight = this._mediumSize
			}
			if (mediumImageWidth) {
				this.setState({ mediumImageWidth, mediumImageHeight })
			}
		}
	}
	
	private _fitToFrame(): void {
		let imageWidth = this.props.imageWidth || this.state.mediumImageWidth
		let imageHeight = this.props.imageHeight || this.state.mediumImageHeight
		let imageAspect = imageWidth / imageHeight
		let frameAspect = this.props.frameWidth / this.props.frameHeight
		let width = this.props.frameWidth
		let height = width / imageAspect
		let top = (this.props.frameHeight - height) / 2
		let left = 0
		if (imageAspect < frameAspect) {
			height = this.props.frameHeight
			width = height * imageAspect
			top = 0
			left = (this.props.frameWidth - width) / 2
		}
		this.setState({ top, left, width, height })
	}
	
	private async _loadImage(isMedium?): Promise<boolean> {
		let ok = false
		let url = this.props.url
		if (url) {
			if (isMedium) {
				let regExp = (/^(.+\/)([^\/]+)(\.[^\.]+)$/)
				let path = url.replace(regExp, '$1')
				let fileName = url.replace(regExp, '$2')
				let fileExt = url.replace(regExp, '$3')
				let middleFileName = 'medium_' + fileName + '.jpg'
				let mediumUrl = path + middleFileName
				url = mediumUrl
			}
		}
		let anotherUrl = this._protocolString + this.props.anotherDomain + url
		let imageSrc = await this._getImage(anotherUrl)
		if (!imageSrc) {
			imageSrc = await this._getImage(url)
		}
		if (imageSrc) {
			if (isMedium) {
				this.setState({ mediumImageSrc: imageSrc })
			} else {
				this.setState({ bigImageSrc: imageSrc })
			}
			ok = true
		}
		return ok
	}
	
	private _getImage(url): Promise<string | void> {
		return new Promise<string | void>(success => {
			let onLoadFailsTimeout = setTimeout(() => {
				success()
			}, 5000)
			let img = new Image()
			img.src = url
			img.onload = () => {
				// let imageSrc = (img.src + '').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
				let imageSrc = (img.src + '')
				if (imageSrc) {
					if (onLoadFailsTimeout) {
						clearTimeout(onLoadFailsTimeout)
					}
					success(imageSrc)
				} else {
					success()
				}
			}
			img.onerror = () => {
				success()
			}
		}).catch(e => {})
	}
	
	private _getImageJsx(url): JSX.Element | null {
		if (url && this.state.width) {
			let transform = `scale(${this.state.scale}) `
			transform += `translateX(${this.state.translateX}px) `
			transform += `translateY(${this.state.translateY}px)`
			let style = {
				top: this.state.top,
				left: this.state.left,
				width: this.state.width,
				height: this.state.height,
				transform,
			}
			return (
				<img
					key={url}
					className={styles.img}
					style={style}
					src={url}
					alt={this.props.alt}
				/>
			)
		} else {
			return null
		}
	}
	
	render(): JSX.Element {
		return (
			<>
				{this._getImageJsx(this.state.bigImageSrc)}
				{this._getImageJsx(this.state.mediumImageSrc)}
			</>
		)
	}
	
	componentDidMount() {
		this._loadImages()
	}
	
	componentDidUpdate(prevProps) {
		if (prevProps.frameWidth !== this.props.frameWidth || prevProps.frameHeight !== this.props.frameHeight) {
			this._loadImages()
		}
	}
}