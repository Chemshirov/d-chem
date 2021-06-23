let obj = {};

obj.ini = () => {
	obj.PATH = obj.o.sda;
	process.on('unhandledRejection',function(reason,p){
		if(reason){
			if((/Too many login attempts/).test((reason+''))){
				let a = '';
			}else{
				if (!obj.o.common.unhandledR) {
					obj.o.common.unhandledR = {}
				}
				let cur = obj.o.common.unhandledR;
				if(!cur.last || ((cur.last*1)+1000*60*20) < obj.o.common.date('now')){
					cur.last = obj.o.common.date('now');
					obj.send('unhandledRejection', reason + ', ' + p);
				}else{
					if(cur.ST)	clearTimeout(cur.ST);
					obj.o.common.unhandledR.ST = setTimeout(function(){
						process.emitWarning('unhandledRejection',reason+'+25m-5s',p);
					},997*60*25);
				};
			};
		};
	});
	process.on('uncaughtException', err => {
		let skip = 0;
		if ((/socket hang up/).test((err+''))) {
			skip = 1;
		} else if ((/ECONNRESET/).test((err+''))) {
			skip = 1;
		} else {
			// obj.send('uncaughtException', err);
			// setTimeout(function(){
				//process.exit(1);
			// },7919);
		};
	});
};

obj.send = (path, err) => {
	obj.fileSave(path, err);
	obj.o.common.error(path, err);
};

obj.fileSave = (errorPath, err) => {
	let date8 = obj.o.common.date(8);
	if (!obj.fileSave.last)	obj.fileSave.last = '';
	let errorText = '\n' + obj.o.common.date() + '\t\t' + errorPath + '\t\t';
	let errStack = '';
	if (typeof err == 'object' && err.stack) {
		errStack = err.stack;
	};
	errorText += JSON.stringify(errStack ? errStack : err);
	let fileName = date8 + '_errors.log';
	let fileFullName = obj.PATH + fileName;
	try {
		if (!obj.o.fs.existsSync(obj.PATH)) {
			obj.o.fs.writeFileSync(fileFullName, errorText);
			obj.o.fs.chownSync(fileFullName, 1000, 1000);
			if (obj.fileSave.last < date8) {
				obj.show();
			};
			obj.fileSave.last = date8;
		} else {
			obj.o.fs.appendFile(fileFullName, errorText, (err) => {
				if (err) throw err;
				obj.fileSave.last = date8;
				obj.show();
			});
		};
	} catch(e) {
		obj.o.common.error('errors fileSave ' + fileName, e);
	};
};

obj.show = (socket) => {
	try {
		let object = {};
		obj.o.fs.readdir(obj.PATH, (err, files) => {
			let errorFileCount = 0;
			files.sort().reverse().forEach(fileName => {
				if ((/[0-9]+_errors.log/).test(fileName)) {
					if (errorFileCount < 5) {
						let file = obj.o.fs.readFileSync(obj.PATH + fileName);
						if (file) {
							let text = file.toString();
							let array = text.split('\n');
							array.forEach((txt) => {
								if (txt) {
									let date = txt.replace(/^([0-9\- \:]+).+$/, '$1');
									let path = txt.replace(new RegExp('^' + date + '\t\t' + '([^\t]+)\t\t.*'), '$1');
									let error = txt.replace(/^.+\t\t.+\t\t(.+)$/, '$1');
									object[date] = {
										path: path,
										error: error
									};
								};
							});
						};
					} else {
						obj.o.fs.unlinkSync(obj.PATH + fileName);
					};
					errorFileCount++;
				};
			});
			if (socket) {
				socket.emit('finance6', {t: 'errorsObject', object: object});
			};
		});
	} catch(e) {
		obj.o.common.error('errors show', e);
	};
};

var a = (function(obj){
	return function(o){
		obj.o = o;
		obj.ini();
		return obj;
	};
})(obj);
module.exports = a;