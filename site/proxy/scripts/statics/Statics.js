const { Buffer } = require('buffer')
const compression = require('compression')
const fs = require('fs')
const express = require('express')
const { Readable } = require('stream')
const Settings = require('../../../../_common/Settings.js')
const WorkerSetter = require('../../../../_common/WorkerSetter.js')
const zlib = require('zlib')

class Statics extends WorkerSetter {
	constructor(parentContext) {
		super(parentContext.onError, parentContext.log)
		this.parentContext = parentContext
		this.currentPath = this.parentContext.currentPath
		this.label = this.constructor.name
		this._falseSentUrlCache = {}
		this.statusCodeOk = 200
	}
	
	async start() {
		try {
			await this.setWorker(this.currentPath + 'scripts/statics/StaticsWorker.js')
			await this.worker.start()
			this._setExpress()
		} catch (error) {
			this.onError(this.label, 'start', error)
		}
	}
	
	onNewFileList(object) {
		this.worker.onNewFileList(object)
	}
	
	addToCache(message) {
		this.worker.addToCache(message)
	}
	
	async tryTo(url, request, response) {
		try {
			let sent = false
			if (!request.upgrade) {
				if (!this._falseSentUrlCache[url]) {
					if (!this._isNeedTheExpress(url)) {
						if (this.worker) {
							let stage = this._getStageByRequest(request)
							let fileProps = await this.worker.getFileProps({ url, stage })
							sent = await this._sendFile(url, fileProps, request, response)
						}
					} else {
						this._express(request, response)
						sent = 'express'
					}
					if (!sent) {
						this._falseSentUrlCache[url] = true
					}
				}
			}
			return sent
		} catch (error) {
			this.onError(this.label, 'tryTo', error)
		}
	}
	
	_sendFile(url, fileProps, request, response) {
		let sent = false
		try {
			if (fileProps) {
				let contentType = this._getMimeType(url)
				let headers = {
					'Connection': 'close',
					'Content-Type': contentType,
					'Cache-Control': 'public',
					'Last-Modified': fileProps.lastModified,
					'X-Powered-By': this.label,
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Credentials': 'true',
					'Access-Control-Expose-Headers': 'Content-Length'
				}
				// this._addAllowOrigin(request, response)
				
				if (fileProps.eTag) {
					headers['ETag'] = fileProps.eTag
				}
				if (fileProps.ttl) {
					headers['Cache-Control'] = 'public, max-age=' + fileProps.ttl + ', immutable'
				}
				if (request.method === 'HEAD') {
					sent = request.method
					response.writeHead(this.statusCodeOk, headers)
					response.end()
				} else {
					sent = this._tryToSend(request, response, fileProps, headers)
				}
			}
		} catch (error) {
			response.statusCode = 500
			response.write(error.toString())
			response.end()
			this.onError(this.label, 'sendFile catch: ' + url, error)
			sent = error.toString()
		}
		return sent
	}
	
	_tryToSend(request, response, fileProps, headers) {
		let fileString = fileProps.fileString
		let encoder = this._getEncoder(request)
		let sent = false
		if (encoder) {
			headers['Content-Encoding'] = encoder
			if (encoder === 'gzip') {
				if (fileProps.gzip) {
					sent = this._tryToSendEncoded(response, headers, fileProps.gzip, 'fileProps.gzip')
				} else {
					let gzip = this._getUint8Array(fileString)
					sent = this._tryToSendEncoded(response, headers, gzip, 'gzip')
				}
			} else {
				let deflated = this._getUint8Array(fileString, true)
				sent = this._tryToSendEncoded(response, headers, deflated, 'deflate')
			}
		}
		if (!sent) {
			headers['Content-Length'] = fileProps.size
			response.writeHead(this.statusCodeOk, headers)
			fs.createReadStream(fileString).pipe(response)
			sent = 'no encoded'
		}
		return sent
	}
	
	_tryToSendEncoded(response, headers, uint8Array, label) {
		let sent = false
		let chunkCount = this._tryToSendUint8Array(response, headers, uint8Array)
		if (chunkCount) {
			sent = label
			if (chunkCount > 1) {
				sent += ', ' + chunkCount + ' chunks'
			}
		}
		return sent
	}
	
	_tryToSendUint8Array(response, headers, uint8Array) {
		if (uint8Array instanceof Uint8Array) {
			headers['Content-Length'] = uint8Array.length
			response.writeHead(this.statusCodeOk, headers)
			let chunkLimit = 16 * 1024
			let chunkCount = Math.ceil(uint8Array.length / chunkLimit)
			for (let i = 0; i < chunkCount; i++) {
				if (chunkCount > 1) {
					let chunk = uint8Array.slice(i * chunkLimit, (i + 1) * chunkLimit)
					response.write(chunk)
				} else {
					response.write(uint8Array)
				}
			}
			response.end()
			return chunkCount
		}
	}
	
	_getUint8Array(fileString, isDeflate) {
		let file = fs.readFileSync(fileString)
		if (!isDeflate) {
			return zlib.gzipSync(file)
		} else {
			return zlib.deflateSync(file)
		}
	}
	
	_addAllowOrigin(request, response) {
		let { hostDomain, originDomain, origin, referer } = this.parentContext.getHeaders(request)
		if (hostDomain !== originDomain) {
			let eventualOrigin = origin || referer
			if (eventualOrigin) {
				if (Settings.domains.includes(originDomain)) {
					response.setHeader('Access-Control-Allow-Origin', eventualOrigin)
					response.setHeader('Access-Control-Allow-Credentials', 'true')
				}
			}
		}
	}
	
	_getEncoder(request) {
		let acceptEncoding = ''
		if (request && request.headers && request.headers['accept-encoding']) {
			acceptEncoding = request.headers['accept-encoding'] + ''
		}
		let mayGzip = this._getMayEncoder(acceptEncoding, 'gzip')
		let mayDeflate = this._getMayEncoder(acceptEncoding, 'deflate')
		return mayGzip || mayDeflate
	}
	
	_getMayEncoder(acceptEncoding, encoder) {
		let length = acceptEncoding.split(encoder).length
		if (length > 1) {
			return encoder
		}
	}
	
	_setExpress(request, response) {
		this._express = express()
		this._express.use(compression())
		this._express.all('*', this._setExpressRoutes.bind(this))
	}
	_isNeedTheExpress(url) {
		let notValid = false
		let reverseUrl = url.split('').reverse().join('')
		let ext = reverseUrl.split('.')[0].split('').reverse().join('')
		if (['map', 'mp3', 'mp4'].includes(ext)) {
			if (!url.endsWith('socket.io.js.map')) {
				notValid = true
			}
		}
		return notValid
	}
	async _setExpressRoutes(request, response) {
		try {
			let stage = this._getStageByRequest(request)
			let url = decodeURI(request.originalUrl + '')
				url = url.replace(/__hash__/g, '#')
			let mapDotExtention = '.map'
			if (url.endsWith(mapDotExtention)) {
				let filePathWithoutDotMap = url.substring(0, url.length - 4)
				let fileProps = await this.worker.getFileProps({ url: filePathWithoutDotMap, stage })
				if (fileProps) {
					let filePath = fileProps.fileString + mapDotExtention
					response.sendFile(filePath)
				} else {
					this._expressOnError(response)
				}
			} else if (url.includes('ogImage.')) {
				response.sendFile('/usr/nodejs/sda/development/site/subsections/multiserver/stageSensitive/ogImage.jpg')
			} else {
				let sda = process.env.SDA.substring(0, process.env.SDA.length - 1)
				let fileString = sda + '/' + stage + '/' + process.env.LABEL + '/subsections' + url
				if (url.startsWith('/films') || url.startsWith('/music')) {
					fileString = sda + url
				} else if (url.startsWith('/audiobooks')) {
					let regExp = /^(\/[^\/]+\/[^\/]+\/)([^\/]+)\/([^\/]+)\/([^\/]+\.mp3)$/
					let path = url.replace(regExp, '$1')
					let author = url.replace(regExp, '$2')
					let name = url.replace(regExp, '$3')
					let file = url.replace(regExp, '$4')
					fileString = sda + path + author + ' - ' + name + '/' + file
				}
				fs.stat(fileString, (error, stats) => {
					if (error || !stats.isFile()) {
						this._expressOnError(response, error)
					} else {
						response.set('Access-Control-Allow-Origin', '*')
						response.set('Access-Control-Allow-Credentials', 'true')
						response.set('Cache-Control', 'public, max-age=' + Settings.staticTtl + ', immutable')
						response.sendFile(fileString)
					}
				})
			}
		} catch (error) {
			this.onError(this.label, 'tryTo', error)
		}
	}
	_expressOnError(response, error) {
		response.statusCode = 404
		response.set({'Content-Type': 'text/html; charset=utf-8'})
		let errorString = ''
		if (error) {
			errorString = error.toString()
		}
		response.end(errorString)
	}
	
	_getStageByRequest(request) {
		let { hostDomain, originDomain, refererDomain } = this.parentContext.getHeaders(request)
		let eventualDomain = hostDomain || originDomain || refererDomain
		let stage = Settings.productionStageName
		if (Settings.developmentDomains.includes(eventualDomain)) {
			stage = Settings.developmentStageName
		}
		return stage
	}
	
	_getMimeType(url) {
		if (!this.mimeTypes) {
			this.mimeTypes = Settings.staticMimeTypes
		}
		let reverseUrl = url.split('').reverse().join('')
		let revertedExt = reverseUrl.split('.')[0]
		let ext = '.' + revertedExt.split('').reverse().join('')
		let type = 'text/plain'
		let knownType = this.mimeTypes[ext]
		if (knownType) {
			type = knownType
		}
		return type
	}
	
	onMessage(type, object) {
		if (type === 'post' && object.label === 'addToCache') {
			if (typeof process.send === 'function') {
				process.send(object)
			}
		} else {
			this.log(type, object)
		}
	}
}

module.exports = Statics