let obj = {};

obj.fileHeader = (socket,name,o) => {
	try{
		if (!obj.files) obj.files = {};
		let fileMD5 = o['header']['md5'];
		let fileObject = obj.files[fileMD5];
		if (fileObject) {
			if (!fileObject['header'])	fileObject['header'] = {};
			fileObject['header']['date'] = obj.o.common.date('now');
			fileObject['header']['client'] = name;
			o['chunks'].forEach( chunkMD5 => {
				if (!fileObject['header'][chunkMD5]) {
					fileObject['header'][chunkMD5] = {};
				};
			});
		} else {
			o['header']['date'] = obj.o.common.date('now');
			o['header']['client'] = name;
			o['chunks'].forEach( chunkMD5 => {
				o['header'][chunkMD5] = {};
			});
			obj.files[fileMD5] = o['header'];
		};
		socket.emit('finance6', {t: 'fileHeader', id: o['id'], md5: fileMD5});
		obj.clear();
	} catch(e) {
		obj.o.errors.send('file obj.fileHeader catch', e);
	};
};
obj.clear = () => {
	if (!obj.files) obj.files = {};
	Object.keys(obj.files).forEach(md5 => {
		let date = obj.files[md5]['date'];
		let expired = obj.o.common.date('now') - 1000 * 60 * 3;
		if (date < expired) {
			delete obj.files[md5];
		};
	});
};

obj.clearFile = (socket, o) => {
	if (o['md5']) {
		let fileMD5 = o['md5'];
		delete obj.files[fileMD5];
		obj.clear();
		socket.emit('finance6', {t: 'fileHasCleared', id: o['id']});
	};
};

obj.fileChunk = (socket, o) => {
	if (o['path']) {
		let path = (o['path'] + '').split(' ');
		let preLast = path[(path.length - 1) - 1];
		let object = obj.files;
		if (object) {
			path.forEach((chunkMD5, i) => {
				if (!object[chunkMD5]){
					object[chunkMD5] = {}; 
				};
				object = object[chunkMD5];
				if (chunkMD5 == preLast) {
					delete object['str'];
				};
			});
			
			object['i'] = o['i'] * 1;
			object['chunksUpperAmount'] = o['chunksAmount'];
			let md5 = obj.getMD5(o['str']);
			// if (Math.random() > 1 / 2)	md5 = 0;
			if (md5 == o['md5']) {
				object['str'] = o['str'];
				let fileMD5 = path[0];
				socket.emit('finance6', {t: 'goodChunk', id: o['id']});
				obj.check(socket, fileMD5);
			} else {
				socket.emit('finance6', {t: 'brokenChunk', id: o['id'], path: o['path']});
			};
		};
	};
};
obj.check = (socket, fileMD5) => {
	let chunksAmount = 0;
	let filledChunks = 0;
	Object.keys(obj.files[fileMD5]).forEach(prop => {
		if (prop.length == 32 && (/[0-9]+/).test(prop)) {
			chunksAmount++;
			let object = obj.files[fileMD5][prop];
			if (object && Object.keys(object).length) {
				filledChunks++;
			};
		};
	});
	if (chunksAmount == filledChunks){
		obj.check.integrity(socket, fileMD5);
	};
};
obj.check.integrity = (socket, fileMD5) => {
	let base64str = obj.check.getText(fileMD5, obj.files[fileMD5]);
	if (base64str) {
		let md5 = obj.getMD5(base64str);
		if (md5 == fileMD5) {
			obj.fileSave(fileMD5, base64str, socket);
		};
	};
};
obj.check.getText = (md5, object) => {
	let ret = false;
	if (object['str']) {
		ret = {
			i: object['i'],
			chunksUpperAmount: object['chunksUpperAmount'],
			str: object['str']
		};
	} else {
		let textObject = {};
		let ok = true;
		Object.keys(object).forEach(prop => {
			if (prop.length == 32 && (/[0-9]+/).test(prop)) {
				let nextLevel = obj.check.getText(prop, object[prop]);
				if (nextLevel) {
					textObject[nextLevel['i']] = nextLevel;
				} else {
					ok = false;
				};
			};
		});
		if (ok) {
			let chunksAmount = Object.keys(textObject).length;
			if (chunksAmount) {
				let firstProp = Object.keys(textObject)[0];
				let chunksAmountMustBe = textObject[firstProp]['chunksUpperAmount'];
				if (chunksAmount == chunksAmountMustBe) {
					let base64 = '';
					Object.keys(textObject).sort((a, b) => {
						return a - b;
					}).forEach(i => {
						base64 += textObject[i]['str'];
					});
					if (base64) {
						let base64md5 = obj.getMD5(base64);
						if (md5 == base64md5) {
							ret = {
								i: object['i'],
								chunksUpperAmount: object['chunksUpperAmount'],
								str: base64
							};
						};
					};
				};
			};
		};
	};
	
	if (ret && ret['i'] === undefined){
		return ret['str'];
	} else {
		return ret;
	};
};
obj.fileSave = (fileMD5, base64str, socket) => {
	let bitmap = Buffer.from(base64str, 'base64');
	let name = obj.files[fileMD5]['name'];
	let fileName = (name + '').replace(/[^0-9A-Za-zА-Яа-яЁё\-\.\+\=\!\@\#\$\%\^\&\*\(\)\:\"\']/, '_');
	let client = obj.files[fileMD5]['client'];
	let path = obj.o.files + 'www/finance6/' + client;
	let lastModified = obj.files[fileMD5]['lastModified'];
	if (lastModified) {
		try {
			if (!obj.o.fs.existsSync(path)) {
				obj.o.fs.mkdirSync(path);
				obj.o.fs.chownSync(path, 1000, 1000);
			};
			let fileFullName = path + '/' + fileName;
			if (!(/[0-9]{8}_[0-9]{6}/).test(fileName)) {
				fileFullName = path + '/' + obj.o.common.date('name', lastModified) + '_' + fileName;
			};
			obj.o.fs.writeFileSync(fileFullName, bitmap);
			obj.o.fs.chownSync(fileFullName, 1000, 1000);
			let lastModifiedSeconds = Math.round(lastModified / 1000);
			obj.o.fs.utimesSync(fileFullName, lastModifiedSeconds, lastModifiedSeconds);
			let type = 'fileHasWritten';
			socket.emit('finance6', {t: type, id: type + fileMD5});
			delete obj.files[fileMD5];
		} catch(e) {
			obj.o.errors.send('file obj.fileSave catch', e);
		};
	};
};
obj.getMD5 = (string) => {
	let shortString = string.substring(0,100);
		shortString += string.substring(900,1000);
		shortString += string.substring(string.length - 100, string.length);
	let md5 = obj.o.crypto.createHash('md5').update(shortString).digest('hex');
	return md5;
};



obj.list = function(socket,name){
	try{
		let path = obj.o.files+'www/finance6/'+name;
		if(obj.o.fs.existsSync(path)){
			socket.emit('finance6',{t:'fileList',fileList:obj.o.fs.readdirSync(path).sort()});
		};
	}catch(e){
		obj.o.errors.send('file obj.list catch', e);
	};
};
obj.remove = function(socket,name,file){
	try{
		let path = obj.o.files+'www/finance6/'+name+'/'+file;
		if(obj.o.fs.existsSync(path)){
			obj.o.fs.unlink(path,function(err){
				if(!err)	obj.list(socket,name);
			});
		};
	}catch(e){
		obj.o.errors.send('file obj.remove catch', e);
	};
};
obj.pin = function(socket,name,o){
	try{
		let fileName = o['name'] + '';
		if ((/[0-9]{8}_[0-9]{6}/).test(fileName)) {
			let date = fileName. replace(/.*([0-9]{8}_[0-9]{6}).*/, '$1');
			let year = date.substring(0, 4);
			let month = date.substring(4, 6);
			let path = obj.o.files+'www/finance6/'+name+'/'+o['name'];
			
			
			let media = obj.o.files + 'www/media/';
			let yearPath = media + year;
			if (!obj.o.fs.existsSync(yearPath)) {
				obj.o.fs.mkdirSync(yearPath);
				obj.o.fs.chownSync(yearPath, 1000, 1000);
			};
			let monthPath = yearPath + '/' + month;
			if (!obj.o.fs.existsSync(monthPath)) {
				obj.o.fs.mkdirSync(monthPath);
				obj.o.fs.chownSync(monthPath, 1000, 1000);
			};
			let newFilePath = monthPath + '/' + o['name'];
			obj.o.fs.copyFile(path, newFilePath, function(err){
				if(!err){
					obj.o.fs.chown(newFilePath, 1000, 1000, function(err){
						if(!err){
							obj.o.fs.unlink(path, function(e){});
							let d = (o['date']+'').substr(0,19);
							if(!obj.o.base.base['media'][name][d])	obj.o.base.base['media'][name][d] = {};
							let newFileURL = newFilePath.replace(new RegExp('^' + media), '');
							obj.o.base.base['media'][name][d][newFileURL] = obj.o.common.date();
							let shortUsers = obj.o.base.base['shortUsers'][name];
							let data = shortUsers[o['date']];
							data['me'] = obj.o.base.base['media'][name][d];
							let nm = data['m'] + JSON.stringify(data['me']);
							data['m'] = obj.o.crypto.createHash('md5').update(nm).digest('hex');
							
							let shortMD5 = '';
							Object.keys(shortUsers).sort().forEach(function(e,i){
								shortMD5 += shortUsers[e]['m'];
							});
							let shortMD5new = obj.o.crypto.createHash('md5').update(shortMD5).digest('hex');
							obj.o.base.admin['shortMD5'][name] = shortMD5new;
							obj.o.base.save.admin();
							obj.o.base.save.user(name);
							
							socket.emit('finance6',{t:'newDataHasAppeared'});
						};
					});
				};
			});
		};
	}catch(e){
		obj.o.errors.send('file obj.pin catch', e);
	};
};

var a = (function(obj){
	return function(o){
		obj.o = o;
		return obj;
	};
})(obj);
module.exports = a;