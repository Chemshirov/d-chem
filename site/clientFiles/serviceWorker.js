let cacheName = 'newCacheDate 23/06/2021, 20.08.16'

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
				if (key.includes('newCacheDate') && key != cacheName) {
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
			let isSocketIoRequests = (request.url.includes('/socket.io/') && request.url.includes('transport='))
			let isGitPage = (request.url.includes('/git'))
			let cleanUrl = request.url.split('?')[0]
				cleanUrl = cleanUrl.split('#')[0]
			let ext = cleanUrl.split('.').pop()
			let isBigFile = (ext === 'mp3' || ext === 'mp4')
			if (!isBigFile && !isSocketIoRequests && !isGitPage) {
				event.respondWith(
					caches.match(request).then(response => {
						if (response) {
							return response
						} else {
							return fetch(request).then(response => {
								return caches.open(cacheName).then(cache => {
									try {
										cache.put(request, response.clone()).catch(error => {
											onError(error)
										})
									} catch(error) {
										onError(error)
									}
									return response
								})
							})
						}
					})
				)
			}
		}
	})
	
} catch(error) {
	onError(error)
}


let onError = (error) => {
	console.log(error)
	// client.postMessage('error', error)
}