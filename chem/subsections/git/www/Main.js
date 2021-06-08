class Main {
	constructor() {
		this.label = 'git'
		this._setListeners()
	}
	
	_setListeners() {
		window.addEventListener('load', () => {
			this._readFromStorage()
			this._setSocket()
		})
		document.addEventListener('click', event => {
			let element = event.target
			if (element.tagName.toLowerCase() === 'button') {
				if (typeof element.getAttribute('changed') === 'string') {
					this._commitChangedFiles(element)
				} else if (typeof element.getAttribute('push') === 'string') {
					this._push(element)
				} else if (typeof element.getAttribute('pushAnyway') === 'string') {
					this._push(element, true)
				} else if (typeof element.getAttribute('pullAble') === 'string') {
					this._pullAble(element)
				} else if (typeof element.getAttribute('pull') === 'string') {
					this._pull(element)
				} else if (typeof element.getAttribute('cli') === 'string') {
					this._cli(element)
				} else if (typeof element.getAttribute('cliShows') === 'string') {
					this._cliShows(element)
				} else if (typeof element.getAttribute('toProduction') === 'string') {
					this._toProduction(element, true)
				} else if (typeof element.getAttribute('copyToProduction') === 'string') {
					this._toProduction(element)
				}
			}
		})
		document.addEventListener('keydown', event => {
			if (event.keyCode === 13) {
				let element = event.target
				if (element.getAttribute('id') === 'cliTextarea') {
					event.preventDefault()
					let button = element.parentElement.querySelector('button[cli]')
					if (button) {
						button.click()
					}
				}
			}
		})
	}
	
	_setSocket() {
		return new Promise(success => {
			if (window.io) {
				let socket = window.io()
				socket.open()
				socket.on(this.label, data => {
					if (data) {
						this._socketFunction(data)
					}
				})
				socket.on('connect', () => {
					socket.emit(this.label, {connected: Date.now()})
				})
				this.socket = socket
			} else {
				setTimeout(() => {
					return this._setSocket()
				}, 2000)
			}
		}).catch(err => {
			console.log(err)
		})
	}
	
	_commitChangedFiles(element) {
		element.setAttribute('disabled', 'disabled')
		this.changedFiles = []
		let changedFilesDiv = element.closest('div.changedFiles')
		let files = changedFilesDiv.querySelectorAll('.form-check-label')
		if (files) {
			files.forEach(label => {
				let checked = label.closest('div').querySelector('input').checked
				if (checked) {
					this.changedFiles.push(label.innerText)
				}
			})
		}
		
		let commitText = changedFilesDiv.querySelector('textarea').value
		if (commitText.length > 1) {
			let id = changedFilesDiv.parentElement.getAttribute('id')
			element.setAttribute('disabled', 'disabled')
			this.emit({
				id,
				type: 'commit',
				text: commitText,
				files: this.changedFiles
			})
		}
	}
	
	_push(element, force) {
		element.setAttribute('disabled', 'disabled')
		let id = this._getId(element)
		this.emit({
			id,
			type: (force ? 'pushAnyway' : 'push')
		})
	}
	
	_pullAble(element) {
		let menuDiv = element.parentElement.querySelector('.dropdown-menu')
			menuDiv.classList.toggle('show')
	}
	
	_pull(element) {
		element.setAttribute('disabled', 'disabled')
		let menuDiv = element.closest('.dropdown-menu')
			menuDiv.classList.remove('show')
		let id = this._getId(element)
		this.emit({
			id,
			type: 'pull'
		})
	}
	
	_cli(element) {
		element.setAttribute('disabled', 'disabled')
		let groupDiv = element.closest('.input-group')
		let textarea = groupDiv.querySelector('textarea')
		let id = this._getId(element)
		this.emit({
			id,
			type: 'cli',
			value: textarea.value
		})
	}
	
	_cliShows(element) {
		element.setAttribute('disabled', 'disabled')
		let id = this._getId(element)
		this.emit({
			id,
			type: 'cliShows',
			value: element.getAttribute('cliShows')
		})
	}
	
	_toProduction(element, firstClick) {
		if (firstClick) {
			element.parentElement.querySelector('.position-absolute.dropdown-menu').classList.toggle('show')
		} else {
			element.setAttribute('disabled', 'disabled')
			let id = this._getId(element)
			this.emit({
				id,
				type: 'copyToProduction'
			})
		}
	}
	
	_getId(element) {
		let idElement = element.closest('[id].project')
		if (idElement) {
			return idElement.getAttribute('id')
		}
	}
	
	emit(object) {
		console.log('emit', object)
		this.socket.emit(this.label, object)
	}
	
	_socketFunction(data) {
		console.log('_socketFunction', data)
		if (data.reload) {
			this._saveToStorage()
			location.reload()
		}
	}
	
	_saveToStorage() {
		let object = {}
			object.textAreaObject = {}
		let textAreas = document.body.querySelectorAll('textarea')
		if (textAreas) {
			textAreas.forEach(element => {
				let pid = this._getId(element)
				let eid = element.id
				if (!object.textAreaObject[pid]) {
					object.textAreaObject[pid] = {}
				}
				object.textAreaObject[pid][eid] = element.value
			})
		}
		sessionStorage.setItem('Main', JSON.stringify(object))
	}
	
	_readFromStorage() {
		let object = JSON.parse(sessionStorage.getItem('Main'))
		if (object) {
			if (object.textAreaObject) {
				Object.keys(object.textAreaObject).forEach(pid => {
					Object.keys(object.textAreaObject[pid]).forEach(eid => {
						let value = object.textAreaObject[pid][eid]
						let textarea = document.body.querySelector('#' + pid + ' textarea#' + eid)
						if (textarea) {
							textarea.value = value
						}
					})
				})
			}
		}
	}
}

new Main()