import Errors from '/js/Errors.js'
import ClassCreator from '/js/ClassCreator.js'
import ServiceWorker from '/js/ServiceWorker.js'
import SocketIO from '/js/SocketIO.js'
import Uid from '/js/Uid.js'

class Index {
	constructor(classCreator) {
		this.classCreator = classCreator
		this.start = Date.now()
		this._init()
	}
	
	onSocketReconnect(callback) {
		if (!this._onSocketReconnectCallback) {
			this._onSocketReconnectCallback = []
		}
		this._onSocketReconnectCallback.push(callback)
		if (this._onSocketReconnectedAlready) {
			callback(this._onSocketReconnectedAlready)
		}
	}
	
	onSocketData(callback) {
		if (!this._onSocketDataCallback) {
			this._onSocketDataCallback = []
		}
		this._onSocketDataCallback.push(callback)
	}
	
	loadReact() {
		return new Promise(success => {
			if (!window.React || !window.ReactDOM) {
				let reactLoaded = Promise.resolve()
				if (!window.React) {
					reactLoaded = this.loader('/js/react17.export.js', 'import', true)
				}
				reactLoaded.then(() => {
					return this.loader('/js/react17dom.export.js', 'import', true)
				}).then(() => {
					success()
				})
			} else {
				success()
			}
		}).catch(error => {
			this.Errors.set(error)
		})
	}
	
	_init() {
		this._getLabel()
		this.uid = new Uid().uid
		this.Errors = this.classCreator.createClass(Errors, 'Errors', this.label, this.classCreator.logs, this.uid)
		try {
			this.randomId = Math.random()
			this.SocketIO = this.classCreator.createClass(SocketIO, 'SocketIO', this)
			
			this.serversInfo = this.SocketIO.serversInfo
			this.SocketIO.onReconnect(this._onSocketReconnect.bind(this))
			this.SocketIO.onRefreshEvent(this._onRefresh.bind(this))
			this.SocketIO.onServerData(this._onServerData.bind(this))
			this.SocketIO.set().then(() => {
				this.loadReact().then(() => {
					this.socket = this.SocketIO.socket
					this._getSrcOrigins()
					this.emit = this._emit
					this.Errors.setSocket(this.socket)
					this._loadModule('Main')
					this._setTimeError()
					this.ServiceWorker = this.classCreator.createClass(ServiceWorker, 'ServiceWorker')
					this.loader('/serviceWorker.js', 'script')
				})
			}).catch(error => {
				this.Errors.set(error)
			})
		} catch (error) {
			this.Errors.set(error)
		}
	}
	
	_onRefresh(date) {
		this._serviceWorkerInstall(date)
	}
	
	_serviceWorkerInstall(date) {
		if (date && this.ServiceWorker) {
			this.ServiceWorker.install(date)
		}
	}
	
	_getLabel() {
		let label = window.location.pathname.replace(/^\/([^\/]+)\/?.*$/, '$1')
		if (!label || label.length < 2) {
			label = 'index'
		}
		this.label = label
	}
	
	_onSocketReconnect(object) {
		this.socket = object.socket
		this.serversInfo = object.serversInfo
		this._getSrcOrigins()
		this.emit = this._emit
		if (this._onSocketReconnectCallback) {
			this._onSocketReconnectCallback.forEach(callback => {
				callback(object)
			})
		} else {
			this._onSocketReconnectedAlready = object
		}
	}
	
	_onServerData(data) {
		if (!data.randomId || (data.randomId == this.randomId)) {
			if (this._onSocketDataCallback) {
				this._onSocketDataCallback.forEach(callback => {
					callback(data)
				})
			}
		}
	}
	
	_emit(object) {
		object.randomId = this.randomId
		this.socket.emit(this.label, object)
	}
	
	loader(url, type, also) {
		return new Promise(success => {
			this._getSrcOrigins()
			this._loaderHeadFetch(url, success)
		}).then(server => {
			if (type === 'css') {
				this._loaderCss(server, url)
			} else if (type === 'fetch') {
				return this._loaderFetch(server, url, also)
			} else if (type === 'script') {
				return this.loaderScript(server, url, also)
			} else if (type === 'import') {
				return this._loaderImport(server, url, also)
			}
		}).catch(error => {
			this.Errors.set(error)
		})
	}
	
	_loaderHeadFetch(url, success, server) {
		let origin = (server || this.loaderSrcOrigin)
		let controller = new AbortController()
		setTimeout(() => {
			controller.abort()
		}, 500)
		let signal = controller.signal
		let request = new Request(origin + url, {signal})
		fetch(request, {method: 'HEAD'}).then(response => {
			if (response.status === 200) {
				success(origin)
			} else {
				if (!server) {
					return this._loaderHeadFetch(url, success, this.alternativeSrcOrigin)
				}
			}
		}).catch(e => {
			if (!server) {
				return this._loaderHeadFetch(url, success, this.alternativeSrcOrigin)
			}
		})
	}
	
	_loaderCss(server, url) {
		let link = document.createElement('link')
		link.id = 'editorCss'
		link.rel = 'stylesheet'
		link.type = 'text/css'
		link.href = server + url
		document.head.appendChild(link)
	}
	
	_loaderFetch(server, url, signal) {
		let request = new Request(server + url, {signal})
		return fetch(request)
	}
	
	loaderScript(server, url, winName) {
		return new Promise(success => {
			let noScript = !document.body.querySelector(`script[src$="${url}"]`)
			let noFunction = !(winName && typeof window[winName] === 'function' || !winName)
			if (noScript || noFunction) {
				let script = document.createElement('script')
					script.src = (server || '') + url
					script.async = true
					script.onload = success
				document.body.appendChild(script)
			} else {
				success()
			}
		}).catch(error => {
			this.Errors.set(error)
		})
	}
	
	_loaderImport(server, url, notClass) {
		return import(/* webpackIgnore: true */ server + url).then(modules => {
			if (notClass) {
				modules.default
			} else {
				this.classCreator.createClass(modules.default, url, this)
			}
		})
	}
	
	_loadModule(url) {
		if (url) {
			let minified = ''
			if (window.location.port != '81') {
				minified = '_webpack'
			}
			let path = '/' + this.label + '/' + url + minified + '.js'
			this.loader(path, 'import')
		}
	}
	
	_getSrcOrigins() {
		this.loaderSrcOrigin = ''
		this.alternativeSrcOrigin = ''
		if (this.serversInfo) {
			this.loaderSrcOrigin = this.serversInfo.loaderPath
			this.alternativeSrcOrigin = this.serversInfo.chatterPath
			if (this.serversInfo.loader  && !this.serversInfo.loader.connected) {
				this.loaderSrcOrigin = this.serversInfo.chatterPath
			}
			if (this.serversInfo.chatter && !this.serversInfo.chatter.connected) {
				this.alternativeSrcOrigin = this.serversInfo.loaderPath
			}
		}
	}
	
	_setTimeError() {
		this.haltTimeError()
		this.timeErrorST = setTimeout(() => {
			this.Errors.set('timeError')
		}, 5000)
	}
	
	haltTimeError() {
		if (this.timeErrorST) {
			clearTimeout(this.timeErrorST)
		}
	}
}

let classCreator = new ClassCreator()
classCreator.createClass(Index, 'Index', classCreator)