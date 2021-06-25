class Settings {
	static get fileLengthMax() {
		return 1024 * 1024 * 1024;
	};
	
	static get chunkLength() {
		return 300 * 1024;
	};
	
	static get chunkLengthMin() {
		return 3 * 1024;
	};
	
	static get maxDelay() {
		return 1000 * 10;
	};
	
	static get socketsLimit() {
		return 10;
	};
	
	static get localStorageName() {
		return 'finance6files';
	};
};

document.addEventListener('socketEstablished', () => {
	FileSender.ini();
});

class FileSender {
	constructor(object) {
		if (typeof object == 'object' && (object.file || object.base64string)) {
			this.object = object;
			this._bluePrint();
		} else {
			this._onError("it isn't a file");
		};
	};
	
	async _bluePrint() {
		this._onLoad();
		let timer = new Timer((percent) => {
			this._onTimer(percent);
		});
		if (!this.base64string) {
			// let getBase64 = new ExtendedFileReader(this.file);
				// Issue: does not work on Iphones.
				// getBase64.onprogress = (per90) => {
					// timer.set(0, per90);
				// };
			// this.base64string = await getBase64.done();
			let awaitBase64 = await new Promise((resolve) => {
				let reader = new FileReader()
					reader.readAsDataURL(this.file)
					reader.onload = (e) => {
						let base64string = (e.target.result + '').replace(/.+\,(.+)/, '$1')
						this.base64string = base64string
						timer.set(0, 90)
						resolve()
					}
			})
		}
		if (this.base64string.length > Settings.fileLengthMax) {
			this._onError("file is too large");
		} else {
			await this._saveTemporaryOnTheDevice();
			this.chunks = new Chunks(this.base64string);
			let header = this._getHeader();
			let headerHasSend = new Socket(header)
				.onNetworkFail(() => {
					this._repeatWhenOnline();
				})
				.onHeaderHasSent(() => {
					timer.set(0, 100);
				});
			let headerHasSent = await headerHasSend;
			if (headerHasSent != this.chunks.md5) {
				this._onError("file has rejected");
			} else {
				this.chunks
					.onSent(per90 => {
						timer.set(1, per90);
					})
					.onUnansweredChunk(id => {
						this.chunks.sendSome(id);
					})
					.onBrokenChunk(id => {
						this.chunks.splitBrokenChunk(id);
					})
					.onReceived(per90 => {
						timer.set(2, per90);
					})
					.onAllSentChunksHaveReceived((unsentAmount) => {
						this.chunks.sendSome();
					})
					.onFileFail(() => {
						this._repeat();
					})
					.onNetworkFail(() => {
						this._repeatWhenOnline();
					})
					.onFileHasWritten(() => {
						timer.set(2, 100);
						this._onDone();
						timer.set();
					});
				this.chunks.sendSome();
			};
		};
	};
	
	onProgress(callback) {
		this.progressCallback = callback;
	};
	
	onDone(callback) {
		this.doneCallback = callback;
	};
	
	onError(callback) {
		if (typeof callback == 'function') {
			if (!this.error) {
				this._onErrorCallBack = callback;
			} else {
				callback(this.prop);
			};
		};
	};
	
	onHide(callback) {
		this.hideCallback = callback;
	};
	
	static ini() {
		Sockets.ini();
		Timer.max = 3;
		window['FileSender'] = FileSender;
	};
	
	_onLoad() {
		if (this.object.file) {
			this.file = this.object.file;
		};
		if (this.object.base64string) {
			this.base64string = this.object.base64string;
		};
		if (this.object.name) {
			this.name = this._addDateToFileName();
		};
		if (this.object.lastModified) {
			this.lastModified = this.object.lastModified;
		};
	};
	
	_onTimer(percent) {
		if (typeof this.progressCallback == 'function') {
			this.progressCallback(percent);
		};
	};
	
	_onDone() {
		this.chunks.onDone();
		if (typeof this.doneCallback == 'function') {
			this.doneCallback();
		};
	};
	
	_onError(prop) {
		let callback = this._onErrorCallBack;
		if (typeof callback === 'function') {
			callback(prop);
		} else {
			this.error = true;
			this.prop = prop;
		};
	};
	
	_getHeader() {
		let type = 'fileHeader';
		let object = {};
			object['t'] = type;
			object['chunks'] = this.chunks.getFirstLevel();
			object['header'] = {};
			object['header']['lastModified'] = this.lastModified;
			object['header']['md5'] = this.chunks.md5;
			object['header']['name'] = this.name;
			object['id'] = type + this.chunks.md5;
		return object;
	};
	
	_repeat() {
		if (!this.fileFailRepeaterCount)	this.fileFailRepeaterCount = 0;
		this.fileFailRepeaterCount++;
		if (this.fileFailRepeaterCount <= 2) {
			this._bluePrint();
		} else {
			let sending = this._getClearFile();
			new Socket(sending).onClearFile(() => {
				this.fileFailRepeaterCount = 0;
				this._bluePrint();
			});
		};
	};
	
	_repeatWhenOnline() {
		if (typeof this.hideCallback == 'function') {
			this.hideCallback(this.name);
		};
	};
	
	_getClearFile() {
		let type = 'clearFile';
		let object = {};
			object['t'] = type;
			object['id'] = type + this.chunks.md5;
			object['md5'] = this.chunks.md5;
		return object;
	};
	
	_saveTemporaryOnTheDevice() {
		if (window.caches) {
			return caches.open('base64strings').then(cache => {
				let object = {};
					object['name'] = this._addDateToFileName();
					object['lastModified'] = this.object.lastModified;
					object['type'] = this.object.type;
					object['base64string'] = this.base64string;
				let response = new Response(JSON.stringify(object));
				return cache.put(object['name']+ '.base64strings', response).then(() => {
					if (this.file) {
						return caches.keys().then(keys => {
							let swCacheName = '';
							keys.sort().reverse().some(key => {
								if ((/^finance6_/).test(key)) {
									swCacheName = key;
									return true;
								};
							});
							return caches.open(swCacheName).then(cache => {
								let response = new Response(this.file);
								let name = object['name'];
								if (window.data && window.data.name) {
									name = window.data.name + '/' + name;
								};
								return cache.put(name, response);
							});
						});
					};
				});
			});
		} else {
			return new Promise( (resolve) => {
				resolve()
			})
		}
	};
	
	_addDateToFileName() {
		let name = this.object.name;
		if (!(/[0-9]{8}_[0-9]{6}/).test(name)) {
			let date14 = ct2.date(14);
			if (this.object.lastModified) {
				date14 = ct2.date(14, this.object.lastModified);
			};
			let date = date14.replace(/([0-9]{8})([0-9]{6})/, '$1_$2');
			name = date + '_' + name;
		};
		return name;
	};
};

class Chunk {
	constructor(parentPath, string, i, chunksAmount){
		if (typeof string =='string') {
			this.parentPath = parentPath;
			this.string = string;
			this.i = i;
			this.chunksAmount = chunksAmount;
			this._add();
		};
	};
	
	_add() {
		this.md5 = this._getMD5();
		this.path = this.parentPath + ' ' + this.md5;
		this.type = 'fileChunk';
		this.id = this.type + this.md5 + this.i + new Timer().getNow();
		let object = {};
			object['t'] = this.type;
			object['id'] = this.id;
			object['md5'] = this.md5;
			object['path'] = this.path;
			object['str'] = this.string;
			object['i'] = this.i;
			object['chunksAmount'] = this.chunksAmount;
		this.sending = object;
	};
	
	_getMD5() {
		let shortString = this.string.substring(0, 100);
			shortString += this.string.substring(900, 1000);
			shortString += this.string.substring(this.string.length - 100, this.string.length);
		return MD5(shortString);
	};
};

class Chunks extends Chunk {
	constructor(string, path){
		super();
		this.items = {}
		if (typeof string =='string') {
			this.string = string;
			this.md5 = this._getMD5();
			this._getChunks(path);
		};
	};
	
	// items = {};
	
	getFirstLevel(type) {
		let array = [];
		Object.keys(this.items).forEach(id => {
			let chunk = this.items[id];
			if (chunk.path.split(' ').length == 2) {
				if (!chunk[type]) {
					array.push(chunk.md5);
				};
			};
		});
		return array;
	};
	
	onSent(callback) {
		this.onSentCallback = this._returnPercent(callback, 'sent');
		return this;
	};
	
	onUnansweredChunk(callback) {
		this.onUnansweredChunkCallback = callback;
		return this;
	};
	
	onBrokenChunk(callback) {
		this.onChunkFailCallback = (t, id) => {
			if (this.items[id]) {
				this.items[id][t] = true;
			};
			callback(id);
			this._areSentChunksHaveReceived();
		};
		return this;
	};
	
	splitBrokenChunk(id) {
		let chunk = this.items[id];
		if (chunk) {
			let pathHead = (chunk.path + '').replace(new RegExp(chunk.md5), '').trim();
			let chunks = new Chunks(chunk.string, pathHead);
			if (chunks.md5) {
				let object = {};
				Object.keys(chunks.items).forEach(id => {
					this.items[id] = chunks.items[id];
					object[id] = chunks.items[id];
				});
				return object;
			} else {
				delete this.items[id]['brokenChunk'];
				delete this.items[id]['sent'];
				this.sendSome();
			};
		};
	};
	
	onReceived(callback) {
		this.onReceivedCallback = (t, id) => {
			if (this.items[id]) {
				this.items[id][t] = true;
			};
			this._concatSplittedChunks(id);
			this._areSentChunksHaveReceived();
			this._returnPercent(callback, 'goodChunk')();
		};
		return this;
	};
	
	onAllSentChunksHaveReceived(callback) {
		this.onAllSentChunksHaveReceivedCallback = callback;
		return this;
	};
	
	onFileHasWritten(callback) {
		this.onFileHasWrittenCallback = () => {
			let array = Object.keys(this.items);
			Sockets.clear(array);
			this.items = {};
			callback();
		};
		return this;
	};
	
	onFileFail(callback) {
		let fileChunkSize = this.getFirstLevel().length;
		if (this.fileFailTimeout)	clearTimeout(this.fileFailTimeout);
		this.fileFailTimeout = setTimeout(() => {
			callback();
		}, Settings.maxDelay * fileChunkSize);
		return this;
	};
	
	onNetworkFail(callback) {
		this.onNetworkFailCallback = callback;
		return this;
	};
	
	onDone() {
		if (this.fileFailTimeout)	clearTimeout(this.fileFailTimeout);
	};
	
	sendSome(id) {
		let array = Object.keys(this.items);
		if (array.length) {
			let sentAmount = 0;
			array.some(itemID => {
				if (id == itemID || !id) {
					let chunk = this.items[itemID];
					if (!chunk.sent) {
						if (sentAmount < Settings.socketsLimit) {
							sentAmount++;
							chunk.sent = true;
							let socket = new Socket(chunk.sending);
								socket.onSent = this.onSentCallback;
								socket.onUnansweredChunk = this.onUnansweredChunkCallback;
								socket.onChunkFail = this.onChunkFailCallback;
								socket.onReceived = this.onReceivedCallback;
								socket.onNetworkFail = this.onNetworkFailCallback;
						} else {
							return true;
						};
					};
				};
			});
			
			if (!this.fileDone) {
				let type = 'fileHasWritten';
				this.fileDone = new Socket({t: type, id: type + this.md5});
				this.fileDone.onFileHasWritten = this.onFileHasWrittenCallback;
			};
			Sockets.sendAll();
		};
	};
	
	_concatSplittedChunks(id) {
		if( this.items[id] ) {
			let parentPath = this.items[id].parentPath;
			let chunksAmount = this.items[id].chunksAmount;
			let peerArray = [];
			let array = Object.keys(this.items);
			if (array.length) {
				array.forEach(itemID => {
					let chunk = this.items[itemID];
					if(chunk.parentPath == parentPath) {
						if(chunk.sent && chunk.goodChunk ) {
							peerArray.push(itemID);
						};
					};
				});
			};
			if(peerArray.length == chunksAmount) {
				let parentMD5 = parentPath.split(' ').pop();
				let parentChunk = this._getParentByMD5(parentMD5);
				if (parentChunk) {
					parentChunk['goodChunk'] = true;
					delete parentChunk['brokenChunk'];
					peerArray.forEach(itemID => {
						delete this.items[itemID];
					});
					this._concatSplittedChunks(parentChunk.id);
				};
			};
		};
	};
	
	_getParentByMD5(md5) {
		let array = Object.keys(this.items);
		if (array.length) {
			array.some(itemID => {
				if (this.items[itemID].md5 == md5) {
					return this.items[itemID];
				};
			});
		};
	};
	
	_areSentChunksHaveReceived() {
		let array = Object.keys(this.items);
		if (array.length) {
			let ok = true;
			let unsentAmount = 0;
			Object.keys(this.items).forEach(id => {
				let chunk = this.items[id];
				if (chunk.sent) {
					if (!chunk.brokenChunk && !chunk.goodChunk) {
						ok = false;
					};
				} else {
					unsentAmount++;
				};
			});
			if (ok) {
				if (typeof this.onAllSentChunksHaveReceivedCallback == 'function') {
					this.onAllSentChunksHaveReceivedCallback(unsentAmount);
				};
			};
		};
	};
	
	_getChunks(parentPath) {
		let newLength = this.string.length / 3;
		if (newLength > Settings.chunkLength)		newLength = Settings.chunkLength;
		if (newLength < Settings.chunkLengthMin)	newLength = Settings.chunkLengthMin;
		let chunksAmount = Math.ceil(this.string.length / newLength);
		if (chunksAmount > 1) {
			let chunkSize = Math.ceil(this.string.length / chunksAmount);
			for (let i = 0; i < chunksAmount; i++) {
				let newString = this.string.substring(i * chunkSize, (i + 1) * chunkSize);
				let path = this.md5;
				if (parentPath) {
					path = parentPath + ' ' + path;
				};
				let chunk = new Chunk(path, newString, i, chunksAmount);
				this.items[chunk.id] = chunk;
			};
		} else {
			delete this.md5;
		};
	};
	
	_returnPercent(callback, dateType) {
		return () => {
			let count = this.getFirstLevel(dateType).length;
			let total = this.getFirstLevel().length;
			let done = (total - count||0);
			let per90 = Math.round(done / total * 90 * 10) / 10;
			callback(per90);
		};
	};
};

class Sockets {
	
	static ini() {
		Sockets.items = {}
		
		this.socket = window['socketIO'];
		this.socket.on('finance6', object => {
			this.answered(object);
		});
		this.emit = window['socketIOemit'];
	};
	
	// static items = {};
	
	static answered(object) {
		if (object && typeof object == 'object') {
			if ( (/file/i).test(object.t) || (/chunk/i).test(object.t) ) {
				let socket = Sockets.items[object.id];
				if (socket) {
					socket.isAnswered(object);
				};
			};
		};
	};
	
	static sendAll() {
		return new Promise((resolve) => {
			this.send(resolve);
		}).catch(err => {
			new SendError(this.name, err);
		});
	};
	
	static send(resolve) {
		let socket = this._getFirstSocket();
		if (socket && socket.object) {
			socket.send();
			
			// next prevents sticking by socketIO
			setTimeout(() => {
				this.send(resolve);
			}, 50);
		} else {
			if (typeof resolve == 'function')	resolve();
		};
	};
	
	static clear(array) {
		if (array) {
			array.forEach(id => {
				delete this.items[id];
			});
		};
	};
	
	static _getFirstSocket() {
		let filterItem = (itemID) => {
			let item = this.items[itemID];
			let date = item.date2sent;
			if (!date) {
				if (!item.object) {
					date = item.date1create;
				} else {
					date = 0;
				};
			};
			return date;
		};
		let socketArray = Object.keys(this.items).sort((a, z) => {
			let fromA = filterItem(a);
			let toZ = filterItem(z);
			return fromA - toZ;
		});
		let firstID = socketArray[0];
		let firstSocket = this.items[firstID];
		if (firstSocket && !firstSocket.date2sent) {
			return firstSocket;
		};
	};
};

class Socket {
	constructor(object) {
		this.object = object;
		this.id = object['id'];
		this.date1create = new Timer().getNow();
		Sockets.items[this.id] = this;
	};
	
	send() {
		if (this.object) {
			if (Sockets.socket.connected) {
				Sockets.emit(this.object);
				this.date2sent = new Timer().getNow();
				this.sentTimeout = setTimeout(() => {
					if (typeof this.onUnansweredChunkCallback == 'function') {
						this.onUnansweredChunkCallback(this.id);
					};
				}, Settings.maxDelay);
				if (typeof this.onSentCallback == 'function') {
					this.onSentCallback();
				};
			} else {
				if (typeof this.onNetworkFailCallback == 'function') {
					this.onNetworkFailCallback();
				};
			}
		};
	};
	
	isAnswered(object) {
		this._clear(object.id);
		if (this.sentTimeout) clearTimeout(this.sentTimeout);
		if (object.t == 'fileHeader') {
			if (typeof this.doneResolve == 'function') {
				this.doneResolve(object.md5);
			};
		};
		if (object.t == 'goodChunk') {
			if (typeof this.onReceivedCallback == 'function') {
				this.onReceivedCallback(object.t, object.id);
			};
		};
		if (object.t == 'brokenChunk') {
			if (typeof this.onChunkFailCallback == 'function') {
				this.onChunkFailCallback(object.t, object.id);
			};
		};
		if (object.t == 'fileHasCleared') {
			if (typeof this.clearFileCallback == 'function') {
				this.clearFileCallback();
			};
		};
		if (object.t == 'fileHasWritten') {
			if (typeof this.onFileHasWrittenCallback == 'function') {
				this.onFileHasWrittenCallback();
			};
		};
	};
	
	onHeaderHasSent(callback) {
		return new Promise((resolve) => {
			this.doneCallback = callback;
			this.doneResolve = resolve;
			this.send();
		}).then((md5) => {
			if (typeof this.doneCallback == 'function') {
				this.doneCallback();
				return md5;
			};
		}).catch(err => {
			new SendError(this.constructor.name, err);
		});
	};
	
	onNetworkFail(callback) {
		this.onNetworkFailCallback = callback;
		return this;
	};
	
	onClearFile(callback) {
		this.clearFileCallback = callback;
		this.send();
	};
	
	set onSent(callback) {
		this.onSentCallback = callback;
	};
	
	set onChunkFail(callback) {
		this.onChunkFailCallback = callback;
	};
	
	set onUnansweredChunk(callback) {
		this.onUnansweredChunkCallback = callback;
	};
	
	set onReceived(callback) {
		this.onReceivedCallback = callback;
	};
	
	set onFileHasWritten(callback) {
		this.onFileHasWrittenCallback = callback;
		this.object = false;
	};
	
	_clear(id) {
		delete Sockets.items[id];
	};
};

class Timer {
	constructor(callback) {
		this.callback = callback
		Timer.levelMax = 10
	};
	
	// static levelMax = 10;
	
	static set max(max){
		this.levelMax = max;
	};
	
	set(level, percent, force) {
		this.level = level;
		this.percent = percent||100;
		let now = this.getNow();
		let timer = now - this.lastTime||0;
		if (timer > 30 || !this.lastTime || !this.level || this.lastLevel != this.level || force) {
			let percentage = this._getPercentage();
			if (percentage > (this.percentage||0) || !this.level) {
				this.percentage = percentage;
				if (typeof this.callback == 'function') {
					this.callback(percentage);
				};
			};
			this.lastTime = now;
		};
		this.lastLevel = level;
	};
	
	getNow() {
		let now = new Date();
		return (now.getTime()) * 1;
	};
	
	_getPercentage() {
		let portion = 1 / Timer.levelMax;
		let percentage = this.level * portion + ((this.percent / 100) * portion);
			percentage = Math.round(percentage * 100 * 10) / 10;
		return percentage;
	};
};

class ExtendedFileReader extends FileReader {
	constructor(file) {
		super()
		super.onload = this._getString()
		window.showO('32')
		this.readFile(file)
	}
	
	set onprogress(callback) {
		super.onprogress = this._getPercent(callback);
	};
	
	set onerror(callback) {
		super.onerror = this._onerror(callback);
	};
	
	readFile(file) {
		window.showO('33')
		super.readAsDataURL(file);
	};
	
	done() {
		return new Promise((resolve) => {
			this.doneResolve = resolve;
		}).catch(err => {
			this.error(error);
		});
	};
	
	error(err) {
		new SendError(this.constructor.name, err);
	};
	
	_getPercent(callback) {
		return function(ProgressEvent) {
			let percent = (Math.round((ProgressEvent.loaded / ProgressEvent.total) * 90));
			if (typeof callback == 'function')	callback(percent);
		};
	};
	
	_getString() {
		return function() {
			let base64string = (this.result + '').replace(/.+\,(.+)/, '$1');
			window.showO(base64string.length)
			if (typeof this.doneResolve == 'function')	this.doneResolve(base64string);
		};
	};
	
	_onerror(callback) {
		return function(error) {
			this.error(error);
			if (typeof callback == 'function')	callback(error);
		};
	};
};

class SendError {
	constructor(path, error){
		this.path = path;
		this.error = error;
		this.send();
	};
	
	send() {
		let sending = {};
			sending['t'] = 'error';
			sending['label'] = 'inputFileSender: ' + this.path;
			sending['err'] = this.error.toString();
		new Socket(sending).send();
	};
}