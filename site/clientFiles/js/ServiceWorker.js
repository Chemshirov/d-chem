import Settings from '/js/Settings.js'

export default class ServiceWorker { 
	constructor() {
		this.install()
	}
	
	install(date) {
		if (navigator && navigator.serviceWorker) {
			if (!this._serviceWorkerInstalled) {
				this._serviceWorkerInstalled = {}
			}
			if (!this._serviceWorkerInstalled[date]) {
				this._serviceWorkerInstalled[date] = true
				if (!date) {
					date = Date.now()
				}
				let path = Settings.urls.serviceWorker
				if (date) {
					path += '?' + date
				}
				navigator.serviceWorker.register(path).then(registration => {
					registration.update()
				}).catch(e => {
					throw e
				})
				
				navigator.serviceWorker.addEventListener('message', event => {
					if (event.data && event.data == 'refresh') {
						location.reload(true)
					}
				})
			}
		} else {
			if (date) {
				location.reload(true)
			}
		}
	}
}