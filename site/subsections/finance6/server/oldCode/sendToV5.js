let obj = {};

obj.send = function(socket,uid,name,o,then){
	if (!obj.send.busy || then) {
		obj.send.busy = true;
		if(o && typeof o=='object' && o['o'] && o['md5']){
			try{
				let clientKey = Object.keys(o['o']).sort().reverse()[0];
				if(clientKey){
					let object = {};
					let ock = o['o'][clientKey];
					Object.keys(ock).forEach(function(d){
						let ob = obj.send.createObj(d, ock[d], Object.keys(ock).length, name, uid);
						if (ob) {
							object[d] = ob;
						};
					});
					if (Object.keys(object).length) {
						if (obj.send.checkUniqueness(o['md5'])) {
							obj.toV5(socket, uid, name, o, clientKey, object)
						} else {
							socket.emit('finance6', {t: 'save2server', 'done': clientKey});
						};
					};
				}else{
					obj.o.start.getMD5();
					obj.send.busy = false;
				};
			}catch(e){
				obj.send.busy = false;
			};
		}else{
			obj.send.busy = false;
		};
	} else {
		if(obj.send.busy.ST)	clearTimeout(obj.send.busy.ST);
		obj.send.busy.ST = setTimeout(function(){
			obj.send.busy = false;
		}, 1009 * 10);
	};
};
obj.send.checkUniqueness = md5 => {
	if (!obj.send.checkUniqueness.md5sObject)	obj.send.checkUniqueness.md5sObject = {};
	let md5sObject = obj.send.checkUniqueness.md5sObject;
	if (!md5sObject[md5]) {
		md5sObject[md5] = obj.o.common.date('now');
		let oldMd5s = [];
		Object.keys(md5sObject).sort().reverse().forEach((e, i) => {
			if (i > 1000) {
				oldMd5s.push(e);
			};
		});
		oldMd5s.forEach(e => {
			delete md5sObject[e];
		});
		return true;
	} else {
		return false;
	};
};
obj.send.createObj = function(d, o, length, name, uid){
	let ob = {};
	let changeDate = false;
	if (length == 2 && !o['delete']) {
		changeDate = true;
	};
	try{
		if(o['a'] && o['a']*1!=0){
			let date = (d+'').substring(0, 19);
			if (changeDate) {
				let lastDigit = date.substring(18, 19);
				let newLastDigit = (lastDigit + 1) % 10;
				date = date.substring(0, 18) + newLastDigit;
			};
			ob['d'] = date;
			ob['types'] = 'in';
			if(o['delete'])		ob['types'] = 'delete'+'-finance6-'+uid;
			ob['companyF'] = o['cf']||name;
			ob['from'] = o['f'] || '';
			ob['date'] = date;
			ob['companyT'] = o['ct']||name;
			ob['to'] = o['t'] || '';
			ob['inputType'] = 'в расходы';
			if(o['i'])		ob['inputType'] = 'в активы';
			ob['amount'] = o['a']+'';
			ob['currency'] = o['c']||o['cu']||'руб.';
			ob['comment'] = o['co']||'';
			ob['userID'] = 'finance6-'+uid;
			ob['userName'] = name;
			ob['realDate'] = obj.o.common.date();
		};
	}catch(e){
		obj.o.error.send('sevdToV5 obj.send.createObj catch', e);
	};
	return ob;
};

obj.toV5 = async (socket, uid, name, o, clientKey, object) => {
	let V5class = require(obj.o.files + 'server/oldCode/v5.js')
	let V5 = new V5class(obj.o)
	V5.getInsertSQL(object)
	await V5.insert(object)
	if (name) {
		await V5.selectTable()
		await V5.handleTypes(name)
		await V5.illUser()
		await V5.getMD5().then(ok => {
			if (ok == 'ok') {
				delete o['o'][clientKey]
				socket.emit('finance6', {t: 'save2server', 'done': clientKey})
				obj.send(socket, uid, name, o, 'then')
			} else {
				obj.send.busy = false
			}
		})
	} else {
		obj.send.busy = false
	}
}

var a = (function(obj){
	return function(o){
		obj.o = o;
		return obj;
	};
})(obj);
module.exports = a;