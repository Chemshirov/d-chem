let obj = {};

obj.start = function(){
	let onDataFunction = data => {
		try{
			let curr = {};
			let ok = false;
			let $ = obj.o.cheerio.load(data,{xml:{normalizeWhitespace:true,xmlMode:false,decodeEntities:false}});
			$('#historicalRateTbl tbody tr').each(function(i,tr){
				let t = $(tr);
				let code = t.find('td:nth-of-type(1)').text();
				let name = t.find('td:nth-of-type(2)').text();
				let rate = t.find('td:nth-of-type(4)').text();
				curr[code] = {name:name, rate:rate};
				if(code=='USD' && (rate+'')*1>5 && (rate+'')*1<500){
					ok = true;
				};
			});
			if(ok){
				console.log('curr', curr)
				if(!obj.admin)	obj.admin = {};
				obj.o.base.admin['currencies'] = {
					date: obj.o.common.date(),
					data: curr
				};
				obj.updateDateCurrencies();
				obj.o.base.save.admin();
				obj.o.base.save.currencies();
				try{
					Object.keys(obj.o.base.sid2name).forEach(function(sid){
						obj.send(false,obj.o.base.sid2name[sid],sid);
					});
				}catch(e){
					obj.o.error.send('getCurrency start catch01', e);
				};
			} else {
				obj.updateDateCurrencies()
			};
		}catch(e){
			obj.updateDateCurrencies();
			obj.o.error.send('getCurrency start catch', e);
		}
	}
	let url = 'https://www.xe.com/currencytables/?from=RUB'
	obj.o.axios.get(url).then((response) => {
		onDataFunction(response.data)
	}).catch(function (error) {
		obj.o.error.send('getCurrency start', error)
	})
};
obj.getRate = function(curr){
	let rate = 1;
	if(curr=='$')		curr = 'USD';
	if(curr=='евро')	curr = 'EUR';
	try{
		rate = (obj.o.base.admin['currencies']['data'][curr]['rate']+'').replace(/[^0-9\.]/g,'')*1;
	}catch(e){
		obj.o.error.send('getRate catch', e);
	};
	return rate;
};
obj.getRound = function(amount){
	let round = 100;
	if(amount<1){
		let n = (amount+'').replace(/[^0]/g,'').length;
		round = Math.pow(10,n)*1000;
	};
	let ret = Math.round((amount+'').replace(/\,/,'.').replace(/[^0-9\.]/g,'')*round)/round;
	if(!(/\./).test(ret))				ret = ret+'.00';
	if((/^[0-9]+\.[0-9]$/).test(ret))	ret = ret+'0';
	return ret;
};
obj.send = function(socket,name,socketID){
	let o = {};
	if(obj.o.base.admin['currencies']){
		let c = obj.o.base.admin['currencies'];
		let currencyDay = (c['date']+'').substr(0,10);
		let nowDay = (obj.o.common.date()+'').substr(0,10);
		if(currencyDay!=nowDay){
			obj.start();
		}
		o = {t:'currencies',data:c};
		if(name){
			if(obj.o.base.base){
				if(obj.o.base.base['dateCurrencies']){
					if(obj.o.base.base['dateCurrencies'][name]){
						obj.updateDateCurrencies.byName(name);
						o['dateCurrencies'] = obj.o.base.base['dateCurrencies'][name];
					};
				};
			};
		};
	};
	if(socket){
		socket.emit('finance6',o);
	};
	if(socketID){
		obj.o.io.to(socketID).emit('finance6',o);
	};
};

obj.updateDateCurrencies = function(){
	Object.keys(obj.o.base.base['shortUsers']).forEach(function(name,i){
		obj.updateDateCurrencies.byName(name);
	});
};
obj.updateDateCurrencies.byName = function(name){
	try{
		let news = {};
		let su = obj.o.base.base['shortUsers'][name];
		let file = obj.o.fs.readFileSync(obj.o.sda + 'baseDateCurrencies');
		let dc = JSON.parse(file.toString());
		let weekAgo = obj.o.common.date('',(new Date().getTime())-1000*60*60*24*7);
		Object.keys(su).sort().reverse().some(function(d,i){
			if(d>weekAgo){
				let day = (d+'').substr(0,10);
				if(dc[day]){
					let curr = su[d]['c'];
					if(curr=='$')		curr = 'USD';
					if(curr=='евро')	curr = 'EUR';
					if(dc[day][curr]){
						let rate = dc[day][curr]['rate'];
						if(!obj.o.base.base['dateCurrencies'][name][curr]){
							obj.o.base.base['dateCurrencies'][name][curr] = {};
						};
						if(!obj.o.base.base['dateCurrencies'][name][curr][day]){
							news[name] = true;
						};
						obj.o.base.base['dateCurrencies'][name][curr][day] = obj.getRound(rate);
					};
				};
			}else{
				return true;
			};
		});
		Object.keys(news).forEach(function(name){
			obj.o.base.save.user(name);
		});
		if(Object.keys(news).length){
			Object.keys(obj.o.base.sid2name).forEach(function(sid){
				if(news[obj.o.base.sid2name[sid]]){
					obj.send(false,obj.o.base.sid2name[sid],sid);
				};
			})
		};
	}catch(e){
		obj.o.error.send('obj.updateDateCurrencies.byName', e);
	};
};

obj.historyDateCurrencies = function(){
	let name = 'Костя';
	if(obj.o.base.base){
		if(obj.o.base.base['dateCurrencies']){
			let b = obj.o.base.base['dateCurrencies'];
			if(!b[name]){
				let o = {};
				let a = {"2014-07-25":{"EUR":"47.187","USD":"35.11"},
						"2014-10-13":{"USD":"40.46"},
						"2014-10-15":{"USD":"40.81"},
						"2014-10-16":{"USD":"39.83"},
						"2014-10-27":{"EUR":"53.61","USD":"42.28"},
						"2014-10-31":{"EUR":"53.86","USD":"43.00"},
						"2014-11-02":{"CUC":"43.00","EUR":"53.86"},
						"2014-11-03":{"CUC":"43.32","EUR":"54.11"},
						"2014-11-04":{"CUC":"43.66","EUR":"54.64"},
						"2014-11-05":{"CUC":"44.35","EUR":"55.352"},
						"2014-11-06":{"CUC":"46.01"},
						"2014-11-07":{"CUC":"46.14"},
						"2014-11-08":{"CUC":"46.14"},
						"2014-11-09":{"CUC":"46.14"},
						"2014-11-10":{"CUC":"45.48"},
						"2014-11-11":{"CUC":"46.67","USD":"46.67"},
						"2014-11-13":{"CUC":"46.59"},
						"2014-11-14":{"USD":"47.30"},
						"2014-11-21":{"EUR":"56.81"},
						"2014-11-23":{"EUR":"56.51"},
						"2014-11-25":{"EUR":"56.57"},
						"2014-12-04":{"CUC":"53.44","EUR":"65.78"},
						"2014-12-05":{"EUR":"66.33"},
						"2014-12-10":{"EUR":"67.28"},
						"2014-12-21":{"EUR":"73.42","USD":"59.79"},
						"2014-12-22":{"EUR":"67.16"},
						"2014-12-26":{"EUR":"66.89"},
						"2014-12-27":{"EUR":"66.89"},
						"2014-12-28":{"EUR":"66.89"},
						"2014-12-29":{"EUR":"68.07"},
						"2014-12-30":{"EUR":"69.13"},
						"2014-12-31":{"EUR":"72.38"},
						"2015-01-01":{"EUR":"72.38"},
						"2015-01-02":{"EUR":"70.46"},
						"2015-01-03":{"EUR":"70.46"},
						"2015-01-04":{"EUR":"70.46"},
						"2015-01-05":{"EUR":"70.39"},
						"2015-01-06":{"EUR":"74.91"},
						"2015-01-07":{"EUR":"75.00"},
						"2015-01-08":{"EUR":"72.37"},
						"2015-01-09":{"EUR":"72.89"},
						"2015-01-10":{"EUR":"72.89"},
						"2015-01-17":{"EUR":"75.66"},
						"2015-02-09":{"EUR":"74.73"},
						"2015-02-11":{"EUR":"74.66"},
						"2015-02-16":{"EUR":"71.41"},
						"2015-02-17":{"EUR":"71.44"},
						"2015-03-15":{"USD":"61.02"},
						"2015-03-17":{"USD":"61.83"},
						"2015-03-18":{"EUR":"70.57","USD":"61.27"},
						"2015-03-19":{"IDR":"0.004606","USD":"60.10"},
						"2015-03-20":{"IDR":"0.004613"},
						"2015-03-21":{"IDR":"0.004613","USD":"60.25"},
						"2015-03-22":{"IDR":"0.004613","USD":"60.25"},
						"2015-03-23":{"IDR":"0.004544","USD":"59.01"},
						"2015-03-24":{"IDR":"0.004544","USD":"57.92"},
						"2015-03-25":{"IDR":"0.004393","USD":"56.96"},
						"2015-03-26":{"IDR":"0.004388","USD":"57.20"},
						"2015-03-27":{"IDR":"0.004402","USD":"57.33"},
						"2015-03-28":{"IDR":"0.004402"},
						"2015-03-29":{"IDR":"0.004402","USD":"57.33"},
						"2015-03-30":{"IDR":"0.004414","USD":"57.69"},
						"2015-04-02":{"USD":"57.09"},
						"2015-04-03":{"IDR":"0.004391"},
						"2015-04-24":{"USD":"51.22"},
						"2015-05-23":{"USD":"50.03"},
						"2015-06-11":{"IDR":"0.004104","EUR":"61.3375","USD":"54.61"},
						"2015-06-16":{"USD":"54.29"},
						"2015-06-17":{"USD":"54.11"},
						"2015-06-29":{"USD":"55.33"},
						"2015-07-22":{"EUR":"62.31"},
						"2015-08-04":{"USD":"62.78"},
						"2015-08-05":{"USD":"63.02"},
						"2015-08-13":{"EUR":"71.43","USD":"64.30"},
						"2015-08-15":{"EUR":"72.45"},
						"2015-08-16":{"EUR":"72.45"},
						"2015-08-17":{"EUR":"72.63"},
						"2015-08-18":{"EUR":"72.68"},
						"2015-08-19":{"EUR":"72.56"},
						"2015-08-20":{"EUR":"75.3275"},
						"2015-08-21":{"EUR":"77.09"},
						"2015-08-24":{"EUR":"81.442"},
						"2015-09-12":{"EUR":"76.606"},
						"2015-10-02":{"USD":"66.39"},
						"2015-10-09":{"USD":"61.05"},
						"2015-10-17":{"USD":"61.85"},
						"2015-10-31":{"EUR":"70.569","USD":"64.06"},
						"2015-11-01":{"TRY":"22.836","USD":"64.05"},
						"2015-11-02":{"KRW":"0.056373","TRY":"22.836","USD":"64.11"},
						"2015-11-03":{"KRW":"0.055837","USD":"63.36"},
						"2015-11-07":{"KRW":"0.055733","USD":"63.78"},
						"2015-11-25":{"EUR":"69.7339","TRY":"22.836"},
						"2015-12-19":{"EUR":"77.10"},
						"2015-12-24":{"USD":"70.29"},
						"2015-12-27":{"EUR":"76.95"},
						"2015-12-29":{"EUR":"79.43"},
						"2015-12-30":{"EUR":"79.75"},
						"2015-12-31":{"EUR":"80.67"},
						"2016-01-01":{"EUR":"80.67"},
						"2016-01-02":{"EUR":"80.67"},
						"2016-01-24":{"EUR":"85.89"},
						"2016-02-12":{"USD":"79.45"},
						"2016-03-07":{"USD":"71.87"},
						"2016-03-15":{"USD":"70.87"},
						"2016-03-17":{"USD":"68.39"},
						"2016-06-09":{"EUR":"73.82","USD":"64.20"},
						"2016-06-13":{"EUR":"74.03"},
						"2016-06-14":{"EUR":"74.35"},
						"2016-06-15":{"EUR":"73.74"},
						"2016-06-16":{"EUR":"73.59"},
						"2016-06-20":{"EUR":"72.42"},
						"2016-06-23":{"EUR":"72.96"},
						"2016-10-30":{"USD":"62.96"},
						"2016-10-31":{"VND":"0.002834","USD":"63.265"},
						"2016-11-01":{"VND":"0.002804","USD":"62.92"},
						"2016-11-02":{"VND":"0.002843"},
						"2016-11-03":{"VND":"0.002856","USD":"63.76"},
						"2016-11-04":{"USD":"64.07"},
						"2016-12-21":{"USD":"61.096"},
						"2016-12-31":{"GEL":"22.91"},
						"2017-01-01":{"GEL":"22.91","USD":"74.10"},
						"2017-01-02":{"GEL":"22.99"},
						"2017-01-03":{"GEL":"22.81"},
						"2017-01-12":{"GEL":"21.66","EUR":"63.33","VND":"0.002628","USD":"59.30"},
						"2017-01-13":{"USD":"59.35"},
						"2017-04-06":{"EUR":"60.06"},
						"2017-04-07":{"EUR":"60.49"},
						"2017-04-08":{"EUR":"60.49"},
						"2017-04-11":{"EUR":"60.45"},
						"2017-11-02":{"TND":"23.34"},
						"2017-11-03":{"TND":"23.40"},
						"2017-11-04":{"TND":"23.40"},
						"2017-11-05":{"TND":"23.40"},
						"2017-12-21":{"USD":"58.48"},
						"2017-12-29":{"IRR":"0.001604","USD":"57.86"},
						"2017-12-30":{"IRR":"0.001604"},
						"2017-12-31":{"IRR":"0.001604"},
						"2018-01-01":{"IRR":"0.001604"},
						"2018-01-02":{"IRR":"0.001588"},
						"2018-01-03":{"IRR":"0.001594"},
						"2018-01-04":{"IRR":"0.001583","USD":"57.13"},
						"2018-01-05":{"EUR":"75.96","IRR":"0.001584","USD":"57.10"},
						"2018-01-06":{"IRR":"0.001584","USD":"57.10"},
						"2018-01-07":{"IRR":"0.001584"},
						"2018-01-08":{"IRR":"0.001581"},
						"2018-01-09":{"IRR":"0.001576"},
						"2018-02-06":{"USD":"57.35"},
						"2018-05-17":{"EUR":"73.16","IRR":"0.001475","TND":"24.56","USD":"61.97"},
						"2018-05-18":{"USD":"62.15"},
						"2018-08-17":{"EUR":"76.82"},
						"2018-09-06":{"EUR":"79.58"},
						"2018-09-07":{"EUR":"80.68"},
						"2018-09-10":{"EUR":"81.27"},
						"2018-09-11":{"EUR":"81.25"},
						"2018-09-12":{"EUR":"80.16"},
						"2018-09-13":{"EUR":"79.43"},
						"2018-09-14":{"EUR":"79.20"},
						"2018-09-21":{"USD":"66.77"},
						"2018-10-01":{"USD":"65.59"},
						"2018-10-02":{"EUR":"75.45","USD":"65.37"},
						"2018-10-03":{"USD":"65.62"},
						"2018-10-04":{"USD":"66.64"},
						"2018-10-21":{"USD":"65.60"},
						"2018-10-24":{"USD":"65.30"},
						"2018-10-29":{"USD":"65.58"},
						"2018-10-30":{"USD":"65.68"},
						"2018-10-31":{"USD":"65.74"},
						"2018-11-01":{"USD":"65.69"},
						"2018-11-02":{"USD":"65.97"},
						"2018-11-03":{"USD":"65.97"},
						"2018-11-04":{"USD":"65.97"},
						"2018-11-05":{"USD":"66.35"},
						"2018-11-06":{"USD":"65.91"},
						"2018-12-11":{"EUR":"75.52","USD":"67.36"},
						"2018-12-29":{"EUR":"79.54"},
						"2018-12-30":{"EUR":"79.54"},
						"2018-12-31":{"EUR":"79.72"},
						"2019-01-01":{"EUR":"79.72"},
						"2019-01-02":{"EUR":"79.36"},
						"2019-01-03":{"EUR":"78.26"},
						"2019-01-04":{"EUR":"77.68"},
						"2019-01-05":{"EUR":"77.68"},
						"2019-01-06":{"EUR":"77.68"},
						"2019-01-07":{"EUR":"76.57"},
						"2019-01-08":{"EUR":"76.72"},
						"2019-01-09":{"EUR":"76.89"},
						"2019-01-10":{"EUR":"77.25"},
						"2019-01-11":{"EUR":"77.37"},
						"2019-01-12":{"EUR":"77.37"},
						"2019-01-13":{"EUR":"77.37"},
						"2019-01-23":{"EUR":"75.23"},
						"2019-01-25":{"EUR":"75.02","USD":"66.12"},
						"2019-02-08":{"EUR":"74.81","USD":"65.93"},
						"2019-03-25":{"USD":"64.25"},
						"2019-04-01":{"USD":"65.63"},
						"2019-04-08":{"EUR":"73.33","USD":"65.15"},
						"2019-04-10":{"EUR":"72.86"},
						"2019-04-25":{"EUR":"72.21"},
						"2019-04-26":{"EUR":"72.11"}};
				Object.keys(a).forEach(function(day){
					Object.keys(a[day]).forEach(function(curr){
						if(!o[curr])	o[curr] = {};
						o[curr][day] = a[day][curr];
					});
				});
				b[name] = o;
				obj.o.base.save.user(name);
			};
		};
	};
};

var a = (function(obj){
	return function(o){
		obj.o = o;
		setTimeout(function(){
			obj.updateDateCurrencies();
		},4321);
		return obj;
	};
})(obj);
module.exports = a;