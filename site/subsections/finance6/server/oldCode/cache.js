let obj = {};

obj.save = function(name,k,v){
	if(!obj.save.cache)	obj.save.cache = {};
	let user = obj.o.base.base['user'];
	if (user && user[name]) {
		if(!obj.save.cache[name])	obj.save.cache[name] = {};
		if(!obj.save.cache[name][user[name]['md5-2']])	obj.save.cache[name][user[name]['md5-2']] = {};
		obj.deleteOld(name);
		obj.save.cache[name][user[name]['md5-2']][k] = v;
	};
};
obj.deleteOld = function(name){
	let user = obj.o.base.base['user'];
	if(user && user[name]){
		if(!obj.save.cache[name]){
			obj.save.cache[name] = {};
		}else{
			Object.keys(obj.save.cache[name]).forEach(function(md52){
				if(md52!=user[name]['md5-2']){
					delete obj.save.cache[name][md52];
				};
			});
		};
	};
};
obj.get = function(name,k){
	let ret = false;
	let user = obj.o.base.base['user'];
	if(user && user[name]){
		if(obj.save.cache){
			if(obj.save.cache[name]){
				if(obj.save.cache[name][user[name]['md5-2']]){
					if(obj.save.cache[name][user[name]['md5-2']][k]){
						ret = obj.save.cache[name][user[name]['md5-2']][k];
					};
				};
			};
		};
	};
	return ret;
};

var a = (function(obj){
	return function(o){
		obj.o = o;
		return obj;
	};
})(obj);
module.exports = a;