var data = {};
data['base'] = {};

data.start = function(){
	if(!data.start.buse){
		data.start.buse = true;
		let a = ct2.getLS('finance6');
		if (a) {
			try{
				let uncompressed = LZString.decompressFromUTF16(a);
				let b = JSON.parse(uncompressed);
				if(b['base'])			data['base'] = b['base'];
				if(b['shortMD5'])		data['shortMD5'] = b['shortMD5'];
				if(b['name'])			data['name'] = b['name'];
				if(b['currencies'])		data['currencies'] = b['currencies'];
				if(b['save2server'])	data['save2server'] = b['save2server'];
				data.go('data.start');
			}catch(e){
				data.isFail();
			};
		} else {
			data.isFail();
			obj.emit({t:'dataExchange'});
		};
		data.compare.currencies();
	};
	data.start.buse = false;
};
data.go = function(source){
	if(!data.go.lastEmit)	data.go.lastEmit = 0;
	if( (ct2.date('now') - data.go.lastEmit) > 1000*3){
		data.go.lastEmit = ct2.date('now');
		if(data['name']){
			obj.getDraw(false,source);
		};
		data.isFail();
		let total = 0;
		if(data['base']){
			total = Object.keys(data['base']).length;
		};
		obj.emit({t:'dataExchange',shortMD5:data['shortMD5'],total:total});
	};
};
data.isFail = function(){
	let buttonsDiv = document.querySelector('#buttons>div');
	if(buttonsDiv){
		buttonsDiv.setAttribute('fail','');
	};
};
data.connection = function(exist){
	let buttons = document.querySelector('#buttons');
	if(buttons){
		if(exist){
			data.go('data.connection');
			buttons.removeAttribute('fail');
		}else{
			buttons.setAttribute('fail','');
		};
	};
};
data.ok = function(){
	if(!data['save2server'] || (data['save2server'] && !Object.keys(data['save2server']).length)){
		let buttonsDiv = document.querySelector('#buttons>div');
		if(buttonsDiv){
			buttonsDiv.removeAttribute('fail');
		};
	}else{
		data.isFail();
	};
};
data.save = function(){
	let ob = {};
	ob['base'] = data['base'];
	ob['shortMD5'] = data['shortMD5'];
	ob['name'] = data['name'];
	ob['currencies'] = data['currencies'];
	ob['save2server'] = data['save2server'];
	let compressed = LZString.compressToUTF16(JSON.stringify(ob));
	ct2.setLS('finance6',compressed);
	obj.getDraw(false,'data.save');
};
data.logout = function(){
	ct2.setLS('finance6','');
	delete data['base'];
	delete data['shortMD5'];
	delete data['name'];
	delete data['currencies'];
	list.draw.clear();
	obj.emit({t:'start'});
};

data.compare = function(o){
	data.isFail();
	if(o && typeof o=='object'){
		if(data && data['base'] && Object.keys(data['base']).length<=o['total']){
			if(o['shortMD5'] != data['shortMD5']){
				data.isFail();
				if(o['someStrings']){
					let arr = Object.keys(o['someStrings']);
					if(arr.length){
						arr.forEach(function(d){
							data['base'][d] = o['someStrings'][d];
						});
						let md5new = data.getMD5();
						if(md5new != o['shortMD5']){
							obj.emit({t:'dataExchange','offset':arr.length});
						}else{
							data['shortMD5'] = o['shortMD5'];
							data.save();
							data.ok();
						};
					};
				}else{
					obj.emit({t:'dataExchange'});
				};
			}else{
				data.ok();
			};
		}else{
			data['base'] = {};
			data['shortMD5'] = '';
			data.isFail();
			data.save();
			obj.emit({t:'dataExchange'});
		};
		
		if(o['currencyDate'])	data.compare.currencies(o['currencyDate']);
	};
};
data.compare.currencies = function(date){
	if(!data.compare.currencies.buse){
		data.compare.currencies.buse = true;
		let ok = false;
		if(date){
			if(data['currencies']){
				if(data['currencies']['date'] == date){
					ok = true;
				};
			};
		}else{
			if(data['currencies']){
				if((data['currencies']['date']+'').substr(0,10) == (ct2.date()+'').substr(0,10)){
					ok = true;
				};
			};
		};
		if(!ok){
			obj.emit({t:'getCurrencies'});
		};
		setTimeout(function(){
			data.compare.currencies.buse = false;
		},997*5);
	};
};
data.getMD5 = function(){
	let md5new = '';
	Object.keys(data['base']).sort().forEach(function(d){
		md5new += data['base'][d]['m'];
	});
	return MD5(md5new);
};

data.cache = function(k,v){
	let ret = false;
	if(data['shortMD5']){
		let getCurrencies = false;
		if(data['currencies']){
			if(data['currencies']['date']){
				let a = data['shortMD5']+data['currencies']['date'];
				if(!data.cache['base'])	data.cache['base'] = {};
				Object.keys(data.cache['base']).forEach(function(e){
					if(e!=a){
						delete data.cache['base'][e];
					};
				});
				if(!data.cache['base'][a]) data.cache['base'][a] = {};
				if(v){
					if(!data.cache['base'][a][k])	data.cache['base'][a][k] = v;
				}else{
					if(data.cache['base'][a][k]){
						ret = data.cache['base'][a][k];
					};
				};
			}else{
				getCurrencies = true;
			};
		}else{
			getCurrencies = true;
		};
		if(getCurrencies){
			data.compare.currencies();
		};
	};
	return ret;
};

data.rate = function(curr,date){
	let rate = 1;
	if(curr){
		let getCurrencies = false;
		if(data['currencies']){
			let c = curr;
			let day = (date+'').substr(0,10)
			if(curr=='$')			c = 'USD';
			if(curr=='евро')		c = 'EUR';
			if(date && day < '2019-05-07'){
				if(curr=='CUP')		c = 'CUC';
				if(curr=='IQD')		c = 'IRR';
				if(curr=='MKD')		c = 'TND';
				if(curr=='MTL')		c = 'TRY';
				if(curr=='OEL')		c = 'GEL';
			};
			try{
				if(day){
					let rateByDate = data['currencies']['byDate'][c][day]
					if (rateByDate) {
						rate = rateByDate
					} else {
						let dayCurrency = data['currencies']['byDate'][c]
						Object.keys(dayCurrency).reverse().some(oneDay => {
							if (oneDay < day) {
								rate = dayCurrency[oneDay]
								dayCurrency[day] = dayCurrency[oneDay]
								return true
							}
						})
					}
				};
				if(rate==1){
					if(data['currencies']['data'][c]){
						rate = data['currencies']['data'][c]['rate']*1;
					}else{
						getCurrencies = true;
					};
				};
			}catch(e){};
		}else{
			getCurrencies = true;
		};
		if(getCurrencies){
			data.compare.currencies();
		};
	};
	return rate;
};