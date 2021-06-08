const fs = require('fs')
const Redis = require('ioredis')
const zlib = require('zlib')

const Settings = require('../../_common/Settings.js')

class StaticGetter {
	constructor(onError) {
		this._onError = onError
		this.label = this.constructor.name
		this.redis = new Redis({ host: process.env.PREFIX + 'redis' })
	}
	
	async sendFile(request, response) {
		try {
			let url = request.url + ''
				url = url.split('?')[0]
				url = url.split('#')[0]
			
			let fileProps = await this._getFile(url)
			console.log(url, fileProps)
			if (fileProps) {
				let statusCode = 200
				let encoder = this._getEncoder(request)
				let contentType = this._getMimeType(url)
				let headers = {
					'Connection': 'close',
					'Content-Type': contentType,
					'Cache-Control': 'public',
					'Last-Modified': fileProps.lastModified,
				}
				if (fileProps.eTag) {
					headers['ETag'] = fileProps.eTag
				}
				if (fileProps.ttl) {
					headers['Cache-Control'] = 'public, max-age=' + fileProps.ttl + ', immutable'
				}
				if (encoder === 'gzip') {
					response.setHeader('Content-Encoding', encoder)
					if (fileProps.gzip && fileProps.eTag) {
						response.writeHead(statusCode, headers)
						response.write(fileProps.gzip)
						response.end()
					} else {
						response.writeHead(statusCode, headers)
						let readStream = fs.createReadStream(fileProps.fileString)
						readStream.pipe(zlib.createGzip()).pipe(response)
					}
				} else if (encoder === 'deflate') {
					response.setHeader('Content-Encoding', encoder)
					response.writeHead(statusCode, headers)
					let readStream = fs.createReadStream(fileProps.fileString)
					readStream.pipe(zlib.createDeflate()).pipe(response)
				} else {
					headers['Content-Length'] = fileProps.size
					response.writeHead(statusCode, headers)
					let readStream = fs.createReadStream(fileProps.fileString)
					readStream.pipe(response).end()
				}
			} else {
				response.statusCode = 400
				response.setHeader('Content-Type', 'text/html; charset=utf-8')
				response.write('Sorry, there is no such file.')
				response.end()
			}
		} catch (err) {
			this._onError(this.label, 'sendFile', err)
		}
	}
	
	async _getFile(url) {
		try {
			let key = 'StaticFiles:' + url
			let fileProps = await this.redis.hgetall(key)
			if (Object.keys(fileProps).length) {
				if (fileProps.gzip) {
					let gzip = await this.redis.getBuffer(key + ':gzip')
					fileProps.gzip = gzip
				}
				return fileProps
			}
		} catch (err) {
			this._onError(this.label, '_getFile', err)
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
}

module.exports = StaticGetter