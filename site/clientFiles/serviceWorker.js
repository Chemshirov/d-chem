let cacheName = 'newCacheDate 30/09/2021, 01.11.40'

try{
	self.addEventListener('install', event => {
		self.skipWaiting()
	})
	
	self.addEventListener('activate', async event => {
		let deleted = false
		try {
			let keys = await caches.keys();
			for (let i = 0; i < keys.length; i++) {
				let key = keys[i]
				if ((key.includes('newCacheDate') || key.includes('chemshirov_')) && key != cacheName) {
					deleted = true
					await caches.delete(key)
				}
			}
		} catch(error) {
			onError(error)
		}
		if (deleted) {
			self.clients.matchAll({includeUncontrolled: true}).then(clients => {
				clients.forEach(client => {
					client.postMessage('refresh')
				})
			}).catch(error => {
				onError(error)
			})
		}
	})
	
	self.addEventListener('fetch', event => {
		let request = event.request
		if (request.method !== 'HEAD') {
			let isQuery = (request.url.split('?').length > 1)
			if (!isQuery) {
				let isGitPage = (request.url.includes('/git'))
				let isLogsPage = (request.url.includes('/logs'))
				let ext = request.url.split('#')[0].split('.').pop()
				let isBigFile = (ext === 'mp3' || ext === 'mp4')
				if (!isGitPage && !isLogsPage && !isBigFile) {
					event.respondWith(getResponse(request))
				}
			}
		}
	})
	
} catch(error) {
	onError(error)
}

let getResponse = request => {
	return caches.match(request).then(response => {
		if (response && response.status === 200) {
			return response
		} else {
			return fetch(request.url).then(response => {
				let responseClone = response.clone()
				if (response && response.status === 200) {
					try {
						self.caches.open(cacheName).then(cache => {
							cache.put(request, responseClone).catch(error => {
								onError(error)
							})
						})
					} catch (error) {
						onError(error)
					}
					return response
				}
			})
		}
	}).then(response => {
		if (response) {
			return response
		}
	}).catch(error => {
		onError(error)
	})
}

let onError = (error) => {
	console.log(error)
	self.clients.matchAll().then(clients => {
		clients.forEach(client => {
			client.postMessage('error', error)
		})
	})
}