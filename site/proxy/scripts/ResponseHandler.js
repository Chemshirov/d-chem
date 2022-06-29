const fs = require('fs')
const RequestHandler = require('./RequestHandler.js')
const Settings = require('../../../_common/Settings.js')
const zlib = require('zlib')

class ResponseHandler {
	constructor(response, onError) {
		this._response = response
		this.onError = onError
		this._statusCodeOk = 200
		this.label = this.constructor.name
	}
	
	sendText(text) {
		this._response.statusCode = this._statusCodeOk
		this._response.setHeader('Content-Type', 'text/html; charset=utf-8')
		this._response.end(text)
	}
	
	tryToSetCors(request) {
		let requestHandler = new RequestHandler(request)
		let { origin } = requestHandler.getHeaders()
		if (origin) {
			this._response.setHeader('Access-Control-Allow-Origin', origin)
			this._response.setHeader('Access-Control-Allow-Credentials', 'true')
			this._response.setHeader('Access-Control-Expose-Headers', 'Content-Length')
		}
		return this._response
	}
	
	tryStreamFile(request, fileProps) {
		return new Promise(success => {
			setTimeout(() => {
				success(false)
			}, Settings.standardTimeout)
			if (fileProps) {
				let headers = this._getHeaders(request, fileProps)
				let requestHandler = new RequestHandler(request)
				if (requestHandler.isMethodHead) {
					this._response.writeHead(this._statusCodeOk, headers)
					this._response.end()
					success('head')
				} else {
					let pathToFile = fileProps.fileString
					let { start, end } = requestHandler.range
					if (start === null) {
						let encoder = requestHandler.getEncoder()
						if (encoder) {
							headers['Content-Encoding'] = encoder
							if (fileProps.gzip && encoder === 'gzip') {
								let sent = this._tryToSendEncoded(headers, fileProps.gzip, 'fileProps.gzip')
								success(sent)
							} else {
								let zlibStream = zlib.createGzip()
								if (encoder === 'deflate') {
									zlibStream = zlib.createDeflate()
								}
								try {
									this._response.writeHead(this._statusCodeOk, headers)
									fs.createReadStream(pathToFile).pipe(zlibStream).pipe(this._response)
									success(encoder + ' stream')
								} catch (error) {
									success('error')
									this.sendError(error)
								}
							}
						} else {
							if (fileProps.size) {
								headers['Content-Length'] = fileProps.size
							}
							try {
								this._response.writeHead(this._statusCodeOk, headers)
								fs.createReadStream(pathToFile).pipe(this._response)
								success('plain stream')
							} catch (error) {
								success('error')
								this.sendError(error)
							}
						}
					} else {
						if (!end) {
							end = fileProps.size - 1
						}
						headers['Connection'] = 'keep-alive'
						headers['Accept-Ranges'] = 'bytes'
						headers['Content-Length'] = (end - start) + 1
						headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + fileProps.size
						let rangeReadStream = fs.createReadStream(pathToFile, { start, end })
						rangeReadStream.on('open', () => {
							try {
								this._response.writeHead(206, headers)
								rangeReadStream.pipe(this._response)
								success('range stream')
							} catch (error) {
								success('error')
								this.sendError(error)
							}
						})
						rangeReadStream.on('error', error => {
							this.sendError(error)
						})
					}
				}
			} else {
				success(false)
			}
		}).catch(error => {
			this.onError(this.label, 'tryStreamFile', error)
		})
	}
	
	sendFileByStream(pathToFile) {
		fs.stat(pathToFile, (error, stats) => {
			if (error) {
				this.sendNotFound(pathToFile + ' is absent')
			} else if (stats.isDirectory()) {
				this.sendNotFound(pathToFile + ' is a directory')
			} else {
				try {
					let headers = this._getHeaders(null, null, stats)
					this._response.writeHead(this._statusCodeOk, headers)
					let stream = fs.createReadStream(pathToFile)
					stream.pipe(this._response)
				} catch (error) {
					success('error')
					this.sendError(error)
				}
			}
		})
	}
	
	rewriteTo(url) {
		let rewriteHeader = { 'Location': url }
		this._response.writeHead(302, rewriteHeader)
		this._response.end()
	}
	
	sendNotFound(text) {
		if (!this._response.statusCode) {
			this._response.setHeader('Connection', 'close')
			this._response.statusCode = 404
		}
		this._response.end(text || '')
	}
	
	sendError(error) {
		if (!this._response.statusCode) {
			if (this._response.setHeader) {
				this._response.setHeader('Connection', 'close')
			}
			this._response.statusCode = 500
		}
		this._response.end(error.toString() || '')
	}
	
	_getHeaders(request, fileProps, stats) {
		let headers = {
			'Connection': 'close',
			'Cache-Control': 'public',
			'X-Powered-By': 'ChemServer',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Credentials': 'true',
			// 'Access-Control-Expose-Headers': 'Content-Length',
		}
		// this._addAllowOrigin(requestHandler) // it does not work without any origin-like headers in request
		
		let requestHandler
		if (request) {
			requestHandler = new RequestHandler(request)
			headers['Content-Type'] = requestHandler.mimeType
		}
		
		if (fileProps) {
			if (fileProps.lastModified) {
				headers['Last-Modified'] = fileProps.lastModified
			}
			
			if (fileProps.eTag) {
				headers['ETag'] = fileProps.eTag
			}
			
			if (requestHandler && requestHandler.url && (requestHandler.url).split('?').length > 1) {
				headers['Cache-Control'] = 'no-store, must-revalidate'
			} else {
				if (fileProps.ttl) {
					headers['Cache-Control'] = 'public, max-age=' + fileProps.ttl + ', immutable'
				}
			}
		} else {
			if (stats) {
				if (stats.mtime) {
					headers['Content-Length'] = stats.size
					headers['Last-Modified'] = stats.mtime.toUTCString()
				}
			}
		}
		
		return headers
	}
	
	_tryToSendEncoded(headers, uint8Array, label) {
		let sentType = null
		let chunkCount = this._tryToSendUint8Array(headers, uint8Array)
		if (chunkCount) {
			sentType = label
			if (chunkCount > 1) {
				sentType += ', ' + chunkCount + ' chunks'
			}
		}
		return sentType
	}
	
	_tryToSendUint8Array(headers, uint8Array) {
		if (uint8Array instanceof Uint8Array) {
			headers['Content-Length'] = uint8Array.length
			this._response.writeHead(this._statusCodeOk, headers)
			let chunkLimit = 16 * 1024
			let chunkCount = Math.ceil(uint8Array.length / chunkLimit)
			for (let i = 0; i < chunkCount; i++) {
				if (chunkCount > 1) {
					let chunk = uint8Array.slice(i * chunkLimit, (i + 1) * chunkLimit)
					this._response.write(chunk)
				} else {
					this._response.write(uint8Array)
				}
			}
			this._response.end()
			return chunkCount
		}
	}
	
	// _addAllowOrigin(requestHandler) {
		// let { hostDomain, originDomain, origin, referer } = requestHandler.getHeaders()
		// if (hostDomain !== originDomain) {
			// let eventualOrigin = origin || referer
			// if (eventualOrigin) {
				// if (Settings.domains.includes(originDomain)) {
					// this._response.setHeader('Access-Control-Allow-Origin', eventualOrigin)
					// this._response.setHeader('Access-Control-Allow-Credentials', 'true')
				// }
			// }
		// }
	// }
}

module.exports = ResponseHandler