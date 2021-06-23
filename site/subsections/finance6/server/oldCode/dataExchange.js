let obj = {};

obj.go = function(socket,name,o){
	if (name) {
		if(obj.o.base.admin['busy']){
			setTimeout(function(){
				obj.go(socket,name,o);
			}, 359);
		}else{
			let currencyDate = '';
			if(obj.o.base.admin['currencies']){
				currencyDate = obj.o.base.admin['currencies']['date'];
			};
			let shortMD5 = obj.o.base.admin['shortMD5'][name];
			if(shortMD5){
				if(!o['shortMD5']){
					let gs = obj.go.getStrings(name,o['offset']);
					if(gs){
						socket.emit('finance6',{
							t:'dataExchange',
							shortMD5:shortMD5,
							total:gs['total'],
							someStrings:gs['o'],
							serviceWorkerDate: obj.o.base['serviceWorkerDate']
						});
					}else{
						obj.o.error.send('dataExchange obj.go', 'obj.go.getStrings('+name+','+o['offset']+') fails');
					};
				}else{
					if(o['shortMD5']==obj.o.base.admin['shortMD5'][name]){
						let data = obj.o.base.base['shortUsers'][name];
						if(data && typeof data=='object'){
							socket.emit('finance6',{
								t:'dataExchange',
								shortMD5:shortMD5,
								total:Object.keys(data).length,
								currencyDate:currencyDate,
								serviceWorkerDate: obj.o.base['serviceWorkerDate']
							});
						}else{
							obj.o.error.send('dataExchange obj.go', '!shortUsers['+name+']');
						};
					}else{
						o['shortMD5'] = '';
						obj.go(socket,name,o);
					};
				};
			};
		};
	};
};
obj.go.getStrings = function(name,offset){
	let o = {};
	let limit = offset+offset*2;
	if(!offset){
		limit = 2;
		offset = 0;
	};
	let data = obj.o.base.base['shortUsers'][name];
	if(data && typeof data=='object'){
		let arr = Object.keys(data);
		if(offset<arr.length){
			arr.sort().reverse().some(function(d,i){
				if(i<(offset+limit)){
					if(i>=offset && i<limit){
						o[d] = data[d];
					};
				}else{
					return true;
				};
			});
			return {'o':o,'total':arr.length};
		}else{
			return false;
		};
	}else{
		obj.o.error.send('dataExchange obj.go.getStrings', '!data');
	};
};

var a = (function(obj){
	return function(o){
		obj.o = o;
		return obj;
	};
})(obj);
module.exports = a;