let obj = {};

obj.setSendNew = (callback) => {
	obj._setSendNewCallback = callback
}
obj.slaveToMaster = (callback) => {
	obj._slaveToMasterCallback = callback
}

obj.go = function(socket,uid){
	let url = (socket.handshake.headers.referer+'')
		.replace(/^http.*:\/\/[^\/]+/,'')
		.replace(/^\/finance6/,'')
		.replace(/^\//,'');
	let nnb = obj.o.base.nameANDbase(uid);
	if(!nnb){
		obj.login(socket,uid);
	}else{
		if (!url)	url == 'list';
		if ((/^getMD5.*/).test(url)) {
			obj.getMD5(socket);
		} else {
			obj.login(socket,uid);
		};
	};
};

obj.login = function(socket,uid,o){
	let login = obj.o.base.admin['logins'][uid];
	if(login){
		obj.getData(login['name'],socket).then(function(ok){
			if(ok!='ok'){
				obj.o.error.send('start login notOK: name='+login['name'],ok);
			}else{
				socket.emit('finance6',{t:'url',title:'Finance6: '+login['name'],url:''});
				socket.emit('finance6', {
					t: 'loginOk',
					name: login['name'], 
					serviceWorkerDate: obj.o.base['serviceWorkerDate']
				});
			};
		});
	}else{
		socket.emit('finance6',{t:'url',title:'Please, sign in.',url:'login',force:true});
		socket.emit('finance6',{t:'login',html:obj.o.html.show('login')});
	};
};
obj.login.sent = function(socket,uid,o){
	if(o){
		let login = obj.o.base.admin['logins'][uid];
		if(login){
			socket.emit('finance6',{t:'name',n:login['name']});
		}else{
			let md5 = obj.o.crypto.createHash('md5').update(o['p']).digest('hex');
			let sql = '';
				sql += 'select realDate from finance5 where types="logins" and ';
				sql += 'userName="'+o['n']+'" and userID="'+md5+'"';
			obj.o.Sql.commit(sql).then(function(d){
				if (d && d[0] && (d[0]['realDate'] + '').length == 19) {
					obj._slaveToMasterCallback({ type: 'new user', uid, name: o['n'] })
					obj.o.base.admin['logins'][uid] = {login:obj.o.common.date(),name:o['n']};
					obj.o.base.save.admin();
					obj.go(socket,uid);
				}else{
					setTimeout(function(){
						obj.go(socket,uid);
					},2345);
				};
			});
		};
	};
};
obj.login.out = function(socket,uid){
	delete obj.o.base.admin['logins'][uid];
	obj.o.base.save.admin();
	socket.emit('finance6',{t:'logout'});
};

obj.getData = function(name,socket){
	return new Promise(function(r,e){
		if(!obj.o.base.admin['currencies']){
			obj.o.getCurrencies.start();
		};
		obj.getData.md52(name).then(function(o){
			let user = obj.o.base.base['user'];
			let ok = false;
			if(user && user[name] && user[name]['md5-2']){
				if(user[name]['md5-2'] == o['md52']){
					let if1 = (Object.keys(user[name]['md5']).length=o['count']);
					let if2 = (Object.keys(user[name]['date']).length=o['count']);
					let if3 = (obj.o.base.base['shortUsers'] && obj.o.base.base['shortUsers'][name]);
					let if4 = false;
					if(if3) if4 = (Object.keys(obj.o.base.base['shortUsers'][name]).length=o['shortCount']);
					if(if1 && if2 && if3 && if4){
						ok = 'ok';
					}else{
						user[name]['md5'] = {};
						user[name]['date'] = {};
					};
				};
			}else{
				console.log("no user[name]['md5-2']", name);
			};
			if(ok){
				r(ok);
			}else{
				r(o);
			};
		});
	}).then(function(o){
		if(o && typeof o=='object' && (o['md52']+'').length==32){
			return new Promise(function(r,e){
				obj.getData.offset(r,e,o,name);
			});
		}else{
			return new Promise(function(r,e){
				r(o);
			});
		};
	}).catch(function(e){
		if(socket){
			socket.emit('finance6',{t:'serverError',e:e,name:name});
		};
		obj.o.error.send('start getData catch', e);
	});
};
obj.getData.md52 = function(name){
	return new Promise(function(r,e){
		let sql = '';
			sql += 'select `from`md52,`comment`count,userID shortCount ';
			sql += 'from finance5 ';
			sql += 'where types="md5-2" and companyF="'+name+'"';
		obj.o.Sql.commit(sql).then(function(d){
			if (d.length) {
				let md52 = (d[0]['md52']+'');
				if(md52.length==32 && r && typeof r=='function'){
					r({md52:md52,count:d[0]['count'],shortCount:d[0]['shortCount']});
				};
			}
		});
	}).catch(function(e){
		obj.o.error.send('start getData.md52 catch', e);
	});
};
obj.getData.offset = function(cb,err,o,name,limit){
	obj.o.base.admin['busy'] = obj.o.common.date();
	let offset = 0;
	if(!limit){
		limit = 2 * 10000;
	}else{
		offset = limit;
		limit = limit * 2 * 10000;
	};
	return new Promise(function(r,e){
		let md5Sql = '';
			md5Sql += 'md5(concat(';
			md5Sql += 'lower(ifnull(substr(types,1,32),"")),lower(ifnull(substr(companyF,1,255),"")),';
			md5Sql += 'lower(ifnull(substr(`from`,1,255),"")),lower(ifnull(substr(`date`,1,32),"")),';
			md5Sql += 'lower(ifnull(substr(companyT,1,255),"")),lower(ifnull(substr(`to`,1,255),"")),';
			md5Sql += 'lower(ifnull(substr(`inputType`,1,32),"")),lower(ifnull(substr(amount,1,32),"")),';
			md5Sql += 'lower(ifnull(substr(currency,1,32),"")),lower(ifnull(substr(`comment`,1,255),"")),';
			md5Sql += 'lower(ifnull(substr(userID,1,255),"")),lower(ifnull(substr(userName,1,32),"")),';
			md5Sql += 'lower(ifnull(substr(realDate,1,32),""))';
			md5Sql += '))';
		let sql = '';
			sql += 'select types,companyF,`from`,`date`,companyT,`to`, ';
			sql += 		'`inputType`,round(amount,5)amount,currency,`comment`, ';
			sql += 		'userID,userName,realDate,'+md5Sql+' md5 ';
			sql += 'from finance5 ';
			sql += 'where length(`date`)=19 ';
			sql += '	and (left(types,6)="in" or left(types,6)="delete") ';
			sql += '	and (companyF="'+name+'" or companyT="'+name+'") ';
			sql += 'order by `date` desc, realDate desc, types,companyF,`from`,companyT,`to` ';
			sql += 'limit '+limit+' offset '+offset+' ';
		obj.o.Sql.commit(sql).then(function(d){
			let user = obj.o.base.base['user'];
			if(!user[name])				user[name] = {};
			if(!user[name]['date']){
				user[name] = {};
				user[name]['date'] = {};
			};
			if(!user[name]['md5'])		user[name]['md5'] = {};
			if(!obj.o.base.base['shortUsers'])				obj.o.base.base['shortUsers'] = {};
			if(!obj.o.base.base['shortUsers'][name])		obj.o.base.base['shortUsers'][name] = {};
			let shortUsers = obj.o.base.base['shortUsers'][name];
			let media = obj.o.base.base['media'][name];
			d.forEach(function(e,i){
				let date = e['date']+'.'+(o['count']-offset-i);
				if(!user[name]['md5'][e['md5']] || !shortUsers[date]){
					user[name]['date'][date] = e;
					if(e['types']=='in' && e['userName']==name){
						shortUsers[date] = {};
						let su = shortUsers[date];
						if(e['companyF']!=name){
							su['cf'] = e['companyF'];
						};
						su['f'] = e['from'];
						if(e['companyT']!=name){
							su['ct'] = e['companyT'];
						};
						su['t'] = e['to'];
						if(e['inputType']=='в активы'){
							su['i'] = 'A';
						};
						su['a'] = e['amount'];
						if(e['currency']!='руб.'){
							su['c'] = e['currency'];
						};
						su['co'] = e['comment'];
						su['m'] = e['md5'];
						if(media[e['date']]){
							su['me'] = media[e['date']];
							let nm = su['m']+JSON.stringify(su['me']);
							su['m'] = obj.o.crypto.createHash('md5').update(nm).digest('hex');
						}
						obj.o.base.base['shortUsers'][name][date] = su;
						
						if (e['realDate'] > obj.o.base.base.lastDate) {
							obj.o.base.base.lastDate = e['realDate']
						}
					};
				};
				user[name]['md5'][e['md5']] = e;
			});
			
			let md5 = '';
			Object.keys(user[name]['md5']).sort().forEach(function(e,i){
				md5 += e;
			});
			let md52new = obj.o.crypto.createHash('md5').update(md5).digest('hex');
			
			let shortMD5 = '';
			Object.keys(shortUsers).sort().forEach(function(e,i){
				shortMD5 += shortUsers[e]['m'];
			});
			let shortMD5new = obj.o.crypto.createHash('md5').update(shortMD5).digest('hex');
			if(o['md52']==md52new && Object.keys(obj.o.base.base['shortUsers'][name]).length==o['shortCount']){
				user[name]['md5-2'] = md52new;
				if(!obj.o.base.admin['shortMD5'])	obj.o.base.admin['shortMD5'] = {};
				obj.o.base.admin['shortMD5'][name] = shortMD5new;
				obj.o.base.admin['busy'] = false;
				obj.o.base.save.admin();
				obj.o.base.save.user(name);
				
				let totalItems = Object.keys(obj.o.base.base['shortUsers'][name]).length
				obj.o.io.emit('finance6',{
					t:'newDataHasAppeared',
					shortMD5:shortMD5new,
					total: totalItems
				});
				
				if (totalItems > obj.o.base.base.totalItems) {
					obj.o.base.base.totalItems = totalItems
				}
				if (obj._setSendNewCallback) {
					obj._setSendNewCallback()
				}
				
				if(cb && typeof cb=='function')	cb('ok');
			}else{
				if(d.length==limit){
					obj.getData.offset(cb,err,o,name,limit);
				}else{
					let if1 = (Object.keys(user[name]['md5']).length>o['count']);
					let if2 = (Object.keys(user[name]['date']).length!=Object.keys(user[name]['md5']).length);
					if(if1 || if2){
						user[name] = {};
						obj.o.base.base['shortUsers'][name] = {};
						obj.getData.offset(cb,err,o,name);
					}else{
						user[name]['md5-2'] = 'md5s are not equal';
						obj.getData(name);
					};
				};
			};
		});
	}).catch(function(e){
		obj.o.error.send('start obj.getData.offset catch', e);
	});
};

obj.getMD5 = function(socket){
	let users = obj.o.base.base['user'];
	if(users && typeof users=='object'){
		return new Promise(function(r,e){
			Object.keys(users).forEach(function(name){
				obj.getData(name).then(function(ok){
					if(ok=='ok'){
						if(socket){
							socket.emit('finance6',{t:'body',html:name,init:'main'});
						}else{
							r(users[name]['md5-2']);
						};
					};
				});
			});
		}).catch(function(e){
			obj.o.error.send('start obj.getMD5 catch', e);
		});
	};
};
obj.getMD5.SI = setInterval(function(){
	obj.getMD5();
}, 1009 * 60);
obj.getMD5.ST = setTimeout(function(){
	obj.getMD5();
}, 1009 * 10);

var a = (function(obj){
	return function(o){
		obj.o = o;
		return obj;
	};
})(obj);
module.exports = a;