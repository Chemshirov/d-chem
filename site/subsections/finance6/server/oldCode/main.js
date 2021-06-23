let obj = {};
obj.label = 'finance6'

obj.connection = function(){
	obj.o.io.on('connection',function(socket){
		socket.on(obj.label, function(o) {
			let uid = obj.o.common.getUID(socket);
			let url = (socket.handshake.headers.referer+'').replace(/^http.*:\/\/[^\/]+/,'');
			if((/\/finance6/).test(url)){
				url = url.replace(/^\/finance6/,'').replace(/^\//,'');
				if(o && typeof o=='object'){
					let name = obj.o.base.nameANDbase(uid,'nameOnly')['name'];
					obj.o.base.sid2name[socket.id] = name;
					if(o['t']=='start')			obj.o.start.go(socket,uid,o);
					if(o['t']=='login')			obj.o.start.login.sent(socket,uid,o);
					if(o['t']=='logout')		obj.o.start.login.out(socket,uid);
					if(o['t']=='dataExchange')	obj.o.dataExchange.go(socket,name,o);
					if(o['t']=='getCurrencies')	obj.o.getCurrencies.send(socket,name);
					if(o['t']=='save2server') 	obj.o.sendToV5.send(socket,uid,name,o);
					
					if(o['t']=='fileHeader')	obj.o.file.fileHeader(socket,name,o);
					if(o['t']=='fileChunk')		obj.o.file.fileChunk(socket,o);
					if(o['t']=='clearFile')		obj.o.file.clearFile(socket,o);
					if(o['t']=='getFileList')	obj.o.file.list(socket,name);
					if(o['t']=='removeFile')	obj.o.file.remove(socket,name,o['name']);
					if(o['t']=='pinFile')		obj.o.file.pin(socket,name,o);
					
					if(o['t']=='error') 		obj.o.errors.send(o['label'] + ', client: ' + name, o['err']);
					if(o['t']=='showErrors')	obj.o.errors.show(socket);
					if(o['t']=='getSQLdump')	obj.o.base.dump(socket);
				};
			};
		});
		socket.on('disconnect',function(){
			delete obj.o.base.sid2name[socket.id];
		})
	});
	obj.o.rabbitMQ.subscribe(obj.onFileChanged.bind(this), '_onFileChanged')
};

obj.currencies = function(o){
	if(obj.currencies.SI) clearInterval(obj.currencies.SI);
	obj.currencies.SI = setInterval(function(){
		obj.o.getCurrencies.start();
	},1009*60*60*9);
	if(!o){
		if(obj.currencies.ST) clearInterval(obj.currencies.ST);
		obj.currencies.ST = setTimeout(function(){
			obj.o.getCurrencies.start();
		},997*60*60*2);
	}else{
		obj.o.getCurrencies.start();
	};
};

obj.html = function(res,url,cookies){
	if(url=='getMD5'){
		obj.o.start.getMD5().then(function(ok){
			res.send(ok);
		});
	}else{
		res.send(obj.o.base.html);
	};
};

obj.onFileChanged = (object) => {
	if (object && object.fileName === 'serviceWorker.js') {
		obj.o.io.emit(obj.label, {t: 'serviceWorker'})
	}
}

obj.slaveToMaster = (object) => {
	obj.o.rabbitMQ.sendToAll(obj.label, object)
}
obj.masterToSlave = (object) => {
	if (object.type === 'new user') {
		obj.o.base.admin['logins'][object.uid] = {login: obj.o.common.date(), name: object.name}
		obj.o.base.save.admin()
	}
}

obj.onNew = (callback) => {
	obj._onNewCallBack = callback
}
obj.newDataHasAppeared = () => {
	if (obj._onNewCallBack) {
		let lastDate = obj.o.base.base.lastDate
		let totalItems = obj.o.base.base.totalItems
		obj._onNewCallBack(lastDate, totalItems)
	}
}

var a = (function(obj){
	return function(o){
		obj.o = o;
		obj.connection();
		obj.currencies();
		return obj;
	};
})(obj);
module.exports = a;