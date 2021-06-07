(function(){
	let obj = {};
		obj.fileLengthMax = 1024 * 1024 * 1024;
		obj.chunkLength = 300 * 1000;
		obj.chunkLengthMin = 3 * 1000;
		obj.maxDelay = 1000 * 60 * 2;
		obj.localStorageName = 'finance6files';
	document.addEventListener('socketEstablished', () => {
		obj.socket = window['socketIO'];
		obj.socketIni();
		obj.emit = window['socketIOemit'];
		obj.read();
		window['addPhoto']['sendFile'] = obj.sendFile;
	});
	obj.socketIni = () => {
		obj.socket.on('finance6', o => {
			// if (o && typeof o == 'object') {
				// if (o['t'] == 'fileHeader')			obj.fileStarter(o['fileMD5']);
				// if (o['t'] == 'brokenChunk')		obj.brokenChunk(o['path']);
				// if (o['t'] == 'goodChunk')			obj.goodChunk(o['path']);
				// if (o['t'] == 'fileHasWritten')		obj.fileHasWritten(o['fileMD5']);
			// };
		});
	};

	obj.sendFile = async (o) => {
		obj.timer(1);
		let file64 = await obj.getBase64(o['file']);
		if (file64.length < obj.fileLengthMax) {
			obj.save(o, file64);
			obj.send();
		};
	};
	obj.getBase64 = (file) => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => {
				let base64txt = (reader.result + '').replace(/.+\,(.+)/, '$1');
				obj.timer(2, 100);
				resolve(base64txt);
			};
			reader.onprogress = (ProgressEvent) => {
				let percent = Math.round((ProgressEvent.loaded / ProgressEvent.total) * 90);
				obj.timer(2, percent);
			};
			reader.onerror = (error) => {
				reject(error);
			};
		}).catch(e => {
			obj.errorHandler('getBase64', e);
		});
	};
	obj.getMD5 = (string) => {
		let shortString = string.substring(0, 100);
			shortString += string.substring(900, 1000);
			shortString += string.substring(string.length - 100, string.length);
		return MD5(shortString);
	};
	
	obj.save = (o, file64) => {
		obj.timer(3, 0);
		let fileMd5 = obj.getMD5(file64);
		let chunks = obj.save.getChunks(file64);
		let header = {
			lastModified: o['lastModified'],
			name: o['name'],
			date: ct2.date('now'),
			md5: fileMd5
		};
		let object = {};
			object['header'] = header;
			object['chunks'] = chunks;
		obj.files[fileMd5] = object;
		obj.timer(3, 50);
		obj.save.toLocalStorage();
		obj.timer(3, 100);
	};
	obj.save.getChunks = (file64, length) => {
		let object = {};
		let stringLimit = (length || obj.chunkLength);
		if (stringLimit < obj.chunkLengthMin){
			stringLimit = obj.chunkLengthMin;
		};
		let count = Math.ceil(file64.length / stringLimit);
		if (count) {
			let chunkSize = Math.ceil(file64.length / count);
			for (let i = 0; i < count; i++) {
				let txt = file64.substring(i * chunkSize, (i + 1) * chunkSize);
				let chunk = obj.save.getChunks.get(i, txt);
				object[chunk.md5] = chunk;
			};
		};
		return object;
	};
	obj.save.getChunks.get = (i, str)  => {
		return {
			i: i,
			str: str,
			md5: obj.getMD5(str)
		};
	};
	obj.save.toLocalStorage = (deleted) => {
		let finance6files = ct2.getLS(obj.localStorageName);
		if (!finance6files) {
			finance6files = {};
		};
		
		Object.keys(obj.files).forEach(fileMd5 => {
			let chunks = obj.files[fileMd5]['chunks'];
			let header = obj.files[fileMd5]['header'];
			let chunksString = JSON.stringify(chunks);
			if (chunksString.length < 1024 * 1024) {
				let compressed = LZString.compressToUTF16(chunksString);
				let object = {
					header: header,
					compressed: compressed
				};
				finance6files[fileMd5] = object;
			};
		});
		
		if (finance6files[deleted]) {
			delete finance6files[deleted];
		};
		
		if (Object.keys(finance6files).length) {
			ct2.setLS(obj.localStorageName, finance6files);
		} else {
			localStorage.removeItem(obj.localStorageName);
		};
	};
	
	obj.read = () => {
		if (!obj.files)	obj.files = {};
		let finance6files = ct2.getLS(obj.localStorageName);
		if (finance6files && typeof finance6files == 'object') {
			Object.keys(finance6files).forEach(md5 => {
				obj.read.uncompress(finance6files[md5]);
			});
		};
		obj.send();
	};
	obj.read.uncompress = (object) => {
		try{
			let header = object['header'];
			let uncompressed = LZString.decompressFromUTF16(object['compressed']);
			let chunks = JSON.parse(uncompressed);
			let object2 = {
				header: header,
				chunks: chunks
			};
			let fileMD5 = header['md5'];
			obj.files[fileMD5] = object2;
		} catch(e) {
			obj.errorHandler('read.uncompress', e);
		};
	};
	
	obj.send = () => {
		Object.keys(obj.files).forEach(fileMD5 => {
			obj.send.header(fileMD5);
		});
	};
	obj.send.header = (fileMD5) => {
		obj.files[fileMD5]['header']['date'] = ct2.date('now');
		let sending = {};
			sending['t'] = 'fileHeader';
			sending['header'] = obj.files[fileMD5]['header'];
			sending['chunks'] = Object.keys(obj.files[fileMD5]['chunks']);
		obj.emit(sending);
		obj.timer(4);
		obj.clear();
	};
	obj.send.chunks = (object) => {
		let chunksAmount = Object.keys(object).length;
		obj.send.chunks.recursion(object, chunksAmount);
	};
	obj.send.chunks.recursion = (object, chunksAmount) => {
		if (!object)	object = {};
		let chunk = Object.keys(object)[0];
		if (chunk) {
			let path = (object[chunk]['path'] + '').split(' ');
			let fileMD5 = path[0];
			if (!obj.send.isExhausted(fileMD5)) {
				let pathString = object[chunk]['path'];
				let sending = {};
					sending['t'] = 'fileChunk';
					sending['path'] = pathString;
					console.log(1, pathString);
					sending['chunksAmount'] = chunksAmount;
					sending['md5'] = chunk;
					sending['str'] = object[chunk]['str'];
					sending['i'] = object[chunk]['i'];
				obj.emit(sending);
				
				if (!obj.send.chunks.recursion.waiter) {
					obj.send.chunks.recursion.waiter = {};
				};
				let waiter = obj.send.chunks.recursion.waiter;
				let waiterDelay = Math.round( obj.maxDelay / 10 );
				waiter[pathString] = setTimeout(() => {
					obj.brokenChunk(pathString);
				},waiterDelay);
				
				let percent = Math.round( (object[chunk]['i'] + 1) / chunksAmount * 100 );
				obj.timer(5, percent);
				delete object[chunk];
				setTimeout(() => {
					obj.send.chunks.recursion(object, chunksAmount);
				},50);
			};
		};
	};
	obj.send.isExhausted = (fileMD5) => {
		let header = obj.files[fileMD5]['header'];
		if(!header['sentCount'])	header['sentCount'] = 0;
		header['sentCount']++;
		let exhaustedAmount = (obj.fileLengthMax / obj.chunkLength) * 10;
		if (header['sentCount'] > exhaustedAmount) {
			return true;
		};
	};
	
	obj.clear = () => {
		if (obj.files) {
			Object.keys(obj.files).forEach(md5 => {
				let date = obj.files[md5]['header']['date'];
				let now = ct2.date('now');
				let expired = now - obj.maxDelay;
				if (date < expired) {
					obj.files[md5]['header']['date'] = now;
					obj.send.header(md5);
				};
			});
		};
		setTimeout(() => {
			obj.timer();
			obj.clear();
		},obj.maxDelay)
	};
	
	obj.fileStarter = (fileMD5) => {
		obj.timer(5, 0);
		if (obj.files[fileMD5]) {
			let chunks = obj.files[fileMD5]['chunks'];
			let chunksObject = {};
			Object.keys(chunks).forEach(chunkMD5 => {
				chunksObject[chunkMD5] = {};
				chunksObject[chunkMD5]['path'] = fileMD5 + ' ' + chunkMD5;
				chunksObject[chunkMD5]['str'] = chunks[chunkMD5]['str'];
				chunksObject[chunkMD5]['i'] = chunks[chunkMD5]['i'];
			});
			obj.send.chunks(chunksObject);
			obj.files[fileMD5]['header']['primeChunksAmount'] = Object.keys(chunks).length;
		};
	};
	obj.brokenChunk = (pathString) => {
		obj.clear();
		let string = obj.brokenChunk.getString(pathString);
		let smallChunks = obj.save.getChunks(string, (string.length / 3));
		let chunksAmount = Object.keys(smallChunks).length;
		let chunksObject = {};
		Object.keys(smallChunks).forEach(chunkMD5 => {
			chunksObject[chunkMD5] = {};
			chunksObject[chunkMD5]['path'] = pathString+' '+chunkMD5;
			chunksObject[chunkMD5]['str'] = smallChunks[chunkMD5]['str'];
			chunksObject[chunkMD5]['i'] = smallChunks[chunkMD5]['i'];
			obj.brokenChunk.getString(pathString, chunkMD5, str, i);
		});
		obj.send.chunks(chunksObject);
	};
	obj.brokenChunk.getString = (pathString, chunkMD5, str, i) => {
		let path = (pathString + '').split(' ');
		let chunks = obj.files[path[0]]['chunks'];
		path.forEach( (md5,i) => {
			if (i) {
				if (!chunks[md5]) {
					chunks[md5] = {};
					chunks[md5]['path'] = pathString;
					if (str) {
						chunks[md5]['str'] = str;
						chunks[md5]['i'] = i;
						chunks[md5]['chunkMD5'] = chunkMD5;
					};
				};
				chunks = chunks[md5];
			};
		});
		return (chunks['str'] + '');
	};
	obj.goodChunk = (pathString) => {
		let path = (pathString + '').split(' ');
		if (path.length == 2) {
			let fileMD5 = path[0];
			if (obj.files[fileMD5]) {
				let header = obj.files[fileMD5]['header'];
				if (!header['primeChunksDone']) {
					header['primeChunksDone'] = 0;
				};
				header['primeChunksDone']++;
				let percent = Math.round((header['primeChunksDone'] / header['primeChunksAmount']) * 100);
				obj.timer(6, percent);
			};
		};
		let waiter = obj.send.chunks.recursion.waiter;
		if (waiter && waiter[pathString]) {
			clearTimeout(waiter[pathString]);
		};
	};
	obj.fileHasWritten = (fileMD5) => {
		obj.timer(7);
		delete obj.files[fileMD5];
		obj.save.toLocalStorage(fileMD5);
		let sending = {};
			sending['t'] = 'getFileList';
		obj.emit(sending);
		obj.timer();
	};
	
	obj.timer = (level, percent, force) => {
		let levelMax = 7 + 1;
		let timer = ct2.date('now') - obj.timer.last||0;
		if (timer > 30 || !obj.timer.last || !level || force) {
			let object = {};
			if (level) {
				object['levelMax'] = levelMax;
				object['level'] = level;
				object['percent'] = percent;
			};
			let event = new CustomEvent('fileSendingTimer', { detail: object });
			// document.dispatchEvent(event);
			obj.timer.last = ct2.date('now');
		};
	};
	obj.errorHandler = (label, err) => {
		let sending = {};
			sending['t'] = 'error';
			sending['label'] = label;
			sending['err'] = err;
		obj.emit(sending);
	};
})();