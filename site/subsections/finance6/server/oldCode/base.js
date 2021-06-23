let obj = {};
obj.html = '';
obj.sid2name = {};

obj.save = function(){
	obj.save.admin();
	Object.keys(obj.base['user']).forEach(function(name){
		obj.save.user(name);
	});
};
obj.save.admin = function(){
	let o = {};
		obj.admin['busy'] = false;
		o.admin = obj.admin;
		o.base = {};
		o.base['user'] = {};
		Object.keys(obj.base['user']).forEach(function(name){
			o.base['user'][name] = obj.base['user'][name]['md5-2'];
		});
	obj.o.fs.writeFile(obj.o.sda + 'base',JSON.stringify(o),function(e){});
};
obj.save.user = function(name){
	let data1 = obj.base['user'][name];
	let data2 = obj.base['shortUsers'][name];
	let data3 = obj.base['dateCurrencies'][name];
	let data4 = obj.base['media'][name];
	let data = {'data':data1,'shortVersion':data2,'dateCurrencies':data3,'media':data4};
	obj.o.fs.writeFile(obj.o.sda + 'base.' + name, JSON.stringify(data),function(e){});
};
obj.save.currencies = function(o){
	let fileName = obj.o.sda + 'baseDateCurrencies';
	if (!o)	o = {};
	if (!o['stat']) {
		obj.o.fs.stat(fileName,function(e,s){
			if(!s){
				o['stat'] = 'no file';
				obj.save.currencies(o);
			}else{
				o['stat'] = 'file exists';
				obj.save.currencies(o);
			};
		});
	} else {
		if(!o['fileHasSaved']){
			if(o['stat']=='no file'){
				if(obj.admin['currencies']){
					let a = {};
					let date = obj.admin['currencies']['date'];
					a[(date+'').substr(0,10)] = obj.admin['currencies']['data'];
					obj.o.fs.writeFile(fileName, JSON.stringify(a), 'utf8', function(e){
						if(!e && o){
							o['fileHasSaved'] = obj.o.common.date();
							obj.save.currencies(o);
						};
					});
				};
			}else{
				try{
					let s = obj.o.fs.readFileSync(fileName);
					let a = JSON.parse(s.toString());
					let baseDay = (obj.admin['currencies']['date']+'').substr(0,10);
					if(!a[baseDay]){
						a[baseDay] = obj.admin['currencies']['data'];
						let a100 = {};
						Object.keys(a).sort().reverse().forEach(function(day,i){
							if(i<3){
								a100[day] = a[day];
							};
						});
						obj.o.fs.writeFile(fileName, JSON.stringify(a100), 'utf8', function(e){
							if(!e && o){
								o['fileHasSaved'] = obj.o.common.date();
								obj.save.currencies(o);
							};
						});
					};
				}catch(e){};
			};
		} else {
			// console.log('fileHasSaved', o['fileHasSaved'])
		}
	};
};

obj.read = function(){
	try{
		let s = obj.o.fs.readFileSync(obj.o.sda + 'base');
		let o = JSON.parse(s.toString());
		obj.admin = o.admin;
		obj.base = o.base;
		if(obj.base['user']){
			let users = {};
			let shortUsers = {};
			let dateCurrencies = {};
			let media = {};
			let lastDate = ''
			let totalItems = 0
			Object.keys(obj.base['user']).forEach(function(name){
				let s = obj.o.fs.readFileSync(obj.o.sda + 'base.'+name);
				let o = JSON.parse(s.toString());
				users[name] = o['data'];
				shortUsers[name] = o['shortVersion'];
				dateCurrencies[name] = o['dateCurrencies'];
				media[name] = o['media']||{};
				let info = obj.getInfo(o)
				if (info.lastDate > lastDate) {
					lastDate = info.lastDate
				}
				totalItems += info.totalItems
			});
			obj.base['user'] = users;
			obj.base['shortUsers'] = shortUsers;
			obj.base['dateCurrencies'] = dateCurrencies;
			obj.base['media'] = media;
			obj.base.lastDate = lastDate
			obj.base.totalItems = totalItems
		};
	}catch(e){
		obj.admin = {};
		obj.base = {};
	};
	obj.read.baseStructure();
};
obj.getInfo = (object) => {
	let lastDate = ''
	let totalItems = Object.keys(object.shortVersion).length
	
	Object.keys(object.data.date).forEach((date, i) => {
		let note = object.data.date[date]
		if (note.types === 'in') {
			if (note.realDate > lastDate) {
				lastDate = note.realDate
			}
		}
	})
	return {lastDate, totalItems}
}
obj.read.baseStructure = function(){
	if(!obj.admin['logins'])			obj.admin['logins'] = {};
	if(!obj.base['user'])				obj.base['user'] = {};
	if(!obj.base['shortUsers'])			obj.base['shortUsers'] = {};
	if(!obj.base['dateCurrencies'])		obj.base['dateCurrencies'] = {};
	if(!obj.base['files'])				obj.base['files'] = {};
};
obj.getHTML = function(){
	let html = obj.o.fs.readFileSync(obj.o.files + 'www_old/.html').toString()
	if (process.env.STAGE === 'development') {
		html = html.replace(/favicon/g, process.env.PREFIX + 'favicon')
	}
	obj.html = html
};
obj.nameANDbase = function(uid,nameOnly){
	let ret = false;
	let login = obj.admin['logins'][uid];
	if(login){
		let user = obj.base['user'];
		let name = login['name'];
		if(user[name]){
			ret = {};
			if(!nameOnly){
				ret['uBase'] = user[name];
			};
			ret['name'] = name;
		};
	};
	return ret;
};

obj.dump = (socket) => {
	obj.dump.get().then((sqlString) => {
		// all users dump!
		socket.emit('finance6', {t: 'sqlString', sqlString: sqlString});
	});
};
obj.dump.get = () => {
	return new Promise(function(r, e){
		try{
			let sqlString = 'DROP TABLE IF EXISTS `finance5`;\n';
			obj.o.Sql.commit('SHOW CREATE TABLE finance5').then((array) => {
				sqlString += array[0]['Create Table'] + ';\n';
				obj.o.Sql.commit('select * from `finance5`').then((array) => {
					let dataStrings = []
					array.forEach((e, i) => {
						let values = []
						Object.keys(e).forEach(c => {
							values.push("'" + (e[c] + '').replace(/'/g, "\\'") + "'")
						})
						dataStrings.push('    (' + values.join() + ')')
						
						if (i && !(i % 50)) {
							let tableNames = []
							Object.keys(e).forEach(c => {
								tableNames.push("`" + c + "`")
							})
							sqlString += 'INSERT INTO `finance5` \n'
							sqlString += '    (' + tableNames.join() + ')\n'
							sqlString += 'VALUES \n'
							
							sqlString += dataStrings.join(',\n').replace(/'null',/g, 'NULL,') + '\n'
							sqlString += 'ON DUPLICATE KEY UPDATE `types` = VALUES(`types`);\n'
							dataStrings = []
						}
					})
					r(sqlString)
				})
			})
		} catch(err) {
			obj.o.errors.send('sqlString catch', err);
		};
	}).catch((err) => {
		obj.o.errors.send('sqlString catch2', err);
	});
};


var a = (function(obj){
	return function(o){
		obj.o = o;
		obj.read();
		obj.getHTML();
		obj.save.currencies();
		return obj;
	};
})(obj);
module.exports = a;