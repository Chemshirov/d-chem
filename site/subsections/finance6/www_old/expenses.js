var expenses = {};

expenses.draw = function(source){
	obj.activateButtons.setColor('expenses');
	list.count();
	list.draw.clear();
	expenses.show(source);
	document.title = 'Finance6: ' + 'expenses';
};

expenses.show = function(source){
	expenses.show.dates();
	let d = 'thisMonth';
	let date = expenses.date.byName(d);
	let ok = expenses.show.spends('expenses.show',date);
	if (ok) {
		ok = expenses.show.income(source,date);
		if (ok) {
			let butt = document.querySelector('#results[expenses] div[total] button[d="'+d+'"]');
			if (butt) {
				expenses.show.clearBold(source);
				butt.setAttribute('c','');
			};
		};
	};
};

expenses.show.dates = function(){
	let dates = '';
	dates += '<div>';
	dates += '<div>';
	dates += 	'<button type="button" class="btn btn-link" d="week">Week</button>';
	dates += 	'<button type="button" class="btn btn-link" d="thisMonth">This month</button>';
	dates += 	'<button type="button" class="btn btn-link" d="month">Month</button>';
	dates += 	'<button type="button" class="btn btn-link" d="3months">3 months</button>';
	dates += 	'<button type="button" class="btn btn-link" d="thisYear">This year</button>';
	dates += 	'<button type="button" class="btn btn-link" d="year">Year</button>';
	dates += 	'<button type="button" class="btn btn-link" d="3years">3 years</button>';
	dates += 	'<button type="button" class="btn btn-link" d="all">All</button>';
	dates += '</div>';
	dates += '</div>';
	let t = document.querySelector('#results div[total]');
	if(t){
		let r = document.querySelector('#results');
			r.setAttribute('expenses','');
		t.innerHTML = dates;
	};
	let butts = document.querySelectorAll('#results[expenses] div[total] button');
	if(butts){
		butts.forEach(function(i){
			i.addEventListener('click',function(a,b,c){
				let d = i.getAttribute('d');
				let date = expenses.date.byName(d);
				let ok = expenses.show.spends('clicked by a total button',date);
				if(ok){
					expenses.show.clearBold('div[total] button');
					i.setAttribute('c','');
				};
			});
		});
	};
};
expenses.show.clearBold = function(source){
	let buttsT = document.querySelectorAll('#results[expenses] div[total] button');
	if(buttsT){
		buttsT.forEach(function(i){
			i.removeAttribute('c');
		});
	};
	let spans = document.querySelectorAll('#results[expenses] table td>span[b]');
	if(spans){
		spans.forEach(function(i){
			i.removeAttribute('b');
		});
	};
	let butts = document.querySelectorAll('#results table caption>button.btn-danger');
	if(butts){
		butts.forEach(function(e){
			let classes = e.getAttribute('class');
			if(classes){
				e.setAttribute('class',(classes+'').replace('btn-danger','btn-outline-danger'));
			};
		});
	};
	if(source && (source+'').substr(0,5)=='click'){
		let str = document.querySelectorAll('#strings table tr.selected');
		if(str){
			str.forEach(function(e){
				let classes = e.getAttribute('class');
				if(classes){
					e.setAttribute('class',(classes+'').replace('selected',''));
				};
			});
		};
	};
	let su = document.querySelector('#sum');
	if(su){
		su.innerHTML = '';
	};
};
expenses.show.fromCache = function(both,ld,rd,exp,inc){
	let o = {};
	let fromCache = data.cache(ld+rd+exp+inc);
	if(fromCache){
		o = fromCache;
	}else{
		o = expenses.get(both,ld,rd,exp,inc);
		data.cache(ld+rd+exp+inc,o);
	};
	return o;
};

expenses.show.spends = function(source,ld,rd,exp,amount,inc){
	ret = false;
	let both = false;
	if(source=='expenses.show' || source=='button' || source=='clicked by a total button'){
		both = 'both';
	};
	let o = expenses.show.fromCache(both,ld,rd,exp,inc);
	let subtotal = 0;
	let r = document.querySelector('#results div[right]');
	if(r){
		let tb = '<table class="table table-sm">';
			tb += '<caption>';
			tb += 	'<button type="button" class="btn btn-lg btn-outline-danger" spends>Spends</button>';
			tb += '</caption>';
		let c = false;
		if(o && o['spends']){
			Object.keys(o['spends']).forEach(function(e){
				tb += '<tr>';
				tb += 	'<td><span'+(exp==e&&!amount?' b':'')+'>'+e+'</span></td>';
				tb += 	'<td><span'+(exp==e&&amount?' b':'')+'>'+o['spends'][e]+'</span></td>';
				tb += 	'<td><span>руб.</span></td>';
				tb += 	'<td><button type="button" class="btn btn-link">*</button></td>';
				tb += '</tr>';
				subtotal += o['spends'][e]*1;
			});
			if(source!='expenses.show.income'){
				if(o['f'] && typeof o['f']=='function')	o['f']();
			};
		};
		tb += '<tr subtotal><td></td><td>'+Math.round(subtotal)+'</td><td>руб.</td></tr>';
		tb += '</table>';
		r.innerHTML = tb;
		if((source+'').substr(0,5)=='click'){
			expenses.show.income('expenses.show.spends',ld,rd);
		};
		ret = true;
	};
	let first = document.querySelectorAll('#results div[right] table td:nth-of-type(1)>span');
	if(first){
		first.forEach(function(i){
			i.addEventListener('click',function(){
				let n = i.innerHTML;
				expenses.show.clearBold('clicked by a right first td');
				expenses.show.spends('clicked by a right first td',expenses.get['spendsMin'][n], expenses.get['spendsMax'][n], n);
			});
		});
	};
	let amounts = document.querySelectorAll('#results div[right] table td:nth-of-type(2)>span');
	if(amounts){
		amounts.forEach(function(i){
			i.addEventListener('click',function(){
				let tr = i.parentElement.parentElement;
				if(tr){
					let n = tr.querySelector('td:nth-of-type(1)>span');
					if(n){
						expenses.show.clearBold('clicked by a right second td');
						expenses.show.spends('clicked by a right second td',expenses.get['ld'],false,n.innerHTML,i.innerHTML);
					};
				};
			});
		});
	};
	let buttR = document.querySelector('#results[expenses] div[right] table caption>button');
	if(buttR){
		buttR.addEventListener('click',function(){
			expenses.show.clearBold('clicked by a right caption');
			let ok = expenses.show.spends('clicked by a right caption');
			if(ok){
				let butt = document.querySelector('#results[expenses] div[right] table caption>button');
				let classes = butt.getAttribute('class');
				if(classes){
					butt.setAttribute('class',(classes+'').replace('btn-outline-danger','btn-danger'));
				};
			};
		});
	};
	return ret;
};

expenses.show.income = function(source,ld,rd,inc,exp){
	let ret = false;
	let subtotal = 0;
	let l = document.querySelector('#results div[left]');
	if(l){
		let tb = '<table class="table table-sm">';
			tb += '<caption>';
			tb += 	'<button type="button" class="btn btn-lg btn-outline-danger" income>Income</button>';
			tb += '</caption>';
			let out = (ld || rd || inc);
			if(!out)	inc = ':::all';
			let o = expenses.show.fromCache(false,ld,rd,exp,inc);
			if(o && o['incomes']){
				Object.keys(o['incomes']).forEach(function(e){
					tb += '<tr>';
					tb += 	'<td><span'+(inc==e?' b':'')+'>'+e+'</span></td>';
					tb += 	'<td><span>'+actives.getRound(o['incomes'][e])+'</span></td>';
					tb += 	'<td><span>руб.</span></td>';
					tb += 	'<td><button type="button" class="btn btn-link">*</button></td>';
					tb += '</tr>';
					subtotal += o['incomes'][e]*1;
				});
				if(!Object.keys(o['incomes']).length){
					tb += '<tr>';
					tb += 	'<td><span></span></td>';
					tb += 	'<td><span></span></td>';
					tb += 	'<td><span></span></td>';
					tb += 	'<td></td>';
					tb += '</tr>';
				};
				if(source!='expenses.show.spends'){
					if(inc && o['f'] && typeof o['f']=='function')	o['f']();
				};
			};
			tb += '<tr subtotal><td></td><td>'+Math.round(subtotal)+'</td><td>руб.</td></tr>';
			tb += '</table>';
			l.innerHTML = tb;
			if((source+'').substr(0,5)=='click'){
				let interval = expenses.show.income.getInterval(inc);
				expenses.show.spends('expenses.show.income',interval['min'],interval['max']);
			};
			actives.show.subtotalsHights();
			ret = true;
	};
	let first = document.querySelectorAll('#results div[left] table td:nth-of-type(1)>span');
	if(first){
		first.forEach(function(i){
			i.addEventListener('click',function(){
				let n = i.innerHTML;
				expenses.show.clearBold('clicked by a left first td');
				expenses.show.income('clicked by a left first td',expenses.get['incomeMin'][n], expenses.get['incomeMax'][n], n);
			});
		});
	};
	let buttL = document.querySelector('#results[expenses] div[left] table caption>button');
	if(buttL){
		buttL.addEventListener('click',function(){
			expenses.show.clearBold('clicked by a left caption');
			let ok = expenses.show.income('clicked by a left caption');
			if(ok){
				let butt = document.querySelector('#results[expenses] div[left] table caption>button');
				let classes = butt.getAttribute('class');
				if(classes){
					butt.setAttribute('class',(classes+'').replace('btn-outline-danger','btn-danger'));
				};
			};
		});
	};
	return ret;
};
expenses.show.income.getInterval = function(inc){
	let min = '';
	let max = '';
	if(inc){
		if(inc==':::all'){
			let now = ct2.date();
			let mi = now;
			Object.keys(expenses.get['incomeMin']).forEach(function(c){
				if(expenses.get['incomeMin'][c]<mi){
					mi = expenses.get['incomeMin'][c];
				};
			});
			if(mi==now)	mi = '';
			min = mi;
			let ma = '0000:00:00';
			Object.keys(expenses.get['incomeMax']).forEach(function(c){
				if(expenses.get['incomeMax'][c]>ma){
					ma = expenses.get['incomeMax'][c];
				};
			});
			if(ma=='0000:00:00')	ma = '';
			max = ma;
		}else{
			min = expenses.get['incomeMin'][inc];
			max = expenses.get['incomeMax'][inc];
		};
	};
	return {min:min,max:max};
};


expenses.get = function(both,ld,rd,spend,income,offset,limit){
	ret = {};
	if(!limit)	limit = 100;
	if(!offset)	offset = 0;
	expenses.get['ld'] = ld;
	expenses.get['spendsTrs'] = {};
	expenses.get['spendsMin'] = {};
	expenses.get['spendsMax'] = {};
	expenses.get['incomeMin'] = {};
	expenses.get['incomeMax'] = {};
	let o = data['base'];
	if(o && typeof o=='object' && data['name'] && data['currencies']){
		let allActives = {};
		let allDatesTr = {};
		let allSpends = {};
		let spends = {};
		let allIncome = {};
		let incomes = {};
		let incomeDatesTr = {};
		Object.keys(o).sort().reverse().forEach(function(d,i){
			let oo = {};
				oo[d] = o[d];
			let dd = (d+'').substr(0,19);
			
			if(!o[d]['cf'] || o[d]['cf']==data['name']){
				if (o[d]['f']){
					if (o[d]['f'] !== 'связь') {
						allActives[o[d]['f']] = true
					}
				};
			};
			
			if( (expenses.date(d) >= expenses.date(ld)) || !ld ){
				if( (expenses.date(d) <= expenses.date(rd)) || !rd ){
					let rubs = data.rate(o[d]['c'],dd)*o[d]['a'];
					if(!o[d]['ct'] || o[d]['ct']==data['name']){
						if(o[d]['t']){
							if(!allSpends[o[d]['t']])	allSpends[o[d]['t']] = 0;
							allSpends[o[d]['t']] += rubs;
							let tr = list.draw.tr(oo,d);
							if(!expenses.get['spendsTrs'][o[d]['t']])	expenses.get['spendsTrs'][o[d]['t']] = '';
							expenses.get['spendsTrs'][o[d]['t']] += tr;
							allDatesTr[d] = tr;
						};
					};
					if((o[d]['cf'] && o[d]['cf']!=data['name']) && (!o[d]['ct'] || o[d]['ct']==data['name'])){
						if(o[d]['t'] && !o[d]['i']){
							if(!allIncome[o[d]['t']])				allIncome[o[d]['t']] = {};
							if(!allIncome[o[d]['t']][o[d]['cf']])	allIncome[o[d]['t']][o[d]['cf']] = 0;
							allIncome[o[d]['t']][o[d]['cf']] += rubs;
							incomeDatesTr[d] = {
								cf:o[d]['cf'],
								t:o[d]['t'],
								tr:list.draw.tr(oo,d)
							};
						};
					};
					if((!o[d]['cf'] || o[d]['cf']==data['name']) && (o[d]['ct'] && o[d]['ct']!=data['name'])){
						if(!o[d]['f'] && !o[d]['t']){
							if(!allIncome[o[d]['t']])				allIncome[o[d]['t']] = {};
							if(!allIncome[o[d]['t']][o[d]['ct']])	allIncome[o[d]['t']][o[d]['ct']] = 0;
							allIncome[o[d]['t']][o[d]['ct']] += rubs;
							incomeDatesTr[d] = {
								cf:o[d]['ct'],
								t:o[d]['t'],
								tr:list.draw.tr(oo,d)
							};
						};
					};
				};
			};
			if(!o[d]['ct'] || o[d]['ct']==data['name']){
				if(o[d]['t']){
					if(!expenses.get['spendsMax'][o[d]['t']]){
						expenses.get['spendsMax'][o[d]['t']] = dd;
					};
					expenses.get['spendsMin'][o[d]['t']] = dd;
				};
			};
			if(o[d]['cf'] && o[d]['cf']!=data['name'] && (!o[d]['ct'] || o[d]['ct']==data['name'])){
				if(o[d]['t'] && !o[d]['i']){
					if(!expenses.get['incomeMax'][o[d]['cf']]){
						expenses.get['incomeMax'][o[d]['cf']] = dd;
					};
					expenses.get['incomeMin'][o[d]['cf']] = dd;
				};
			};
		})
		
		Object.keys(allSpends).sort().forEach(function(s){
			if(!allActives[s]){
				spends[s] = actives.getRound(allSpends[s]);
			}else{
				delete expenses.get['spendsTrs'][s];
				delete expenses.get['spendsMin'][s];
				delete expenses.get['spendsMax'][s];
			};
		});
		let toDelete = {};
		Object.keys(allIncome).forEach(function(s){
			if(!allActives[s] && s)	toDelete[s] = true;
		});
		Object.keys(toDelete).forEach(function(s){
			if(allIncome[s])	delete allIncome[s];
		});
		Object.keys(allIncome).forEach(function(a){
			Object.keys(allIncome[a]).forEach(function(c){
				if(!incomes[c])	incomes[c] = 0;
				incomes[c] += allIncome[a][c];
			});
		});
		toDelete = {};
		Object.keys(expenses.get['incomeMin']).forEach(function(c){
			if(!incomes[c]){
				toDelete[c] = true;
			};
		});
		Object.keys(toDelete).forEach(function(c){
			delete expenses.get['incomeMin'][c];
			delete expenses.get['incomeMax'][c];
		});
		
		let tb = '';
			tb += '<table class="table table-striped table-hover">';
			let count = 0;
			let countAll = 0;
			if(!both){
				if(!income){
					Object.keys(allDatesTr).some(function(d,i){
						if(offset<=countAll){
							if(count<limit){
								if(o[d]['t']==spend || !spend){
									tb += allDatesTr[d];
									count++;
								};
							}else{
								return true;
							};
						};
						countAll++;
					});
				}else{
					Object.keys(incomeDatesTr).some(function(d,i){
						if(offset<=countAll){
							if(count<limit){
								if(incomeDatesTr[d]['cf']==income || income==':::all'){
									if(!incomeDatesTr[d]['t'] || allActives[incomeDatesTr[d]['t']]){
										tb += incomeDatesTr[d]['tr'];
										count++;
									};
								};
							}else{
								return true;
							};
						};
						countAll++;
					});
				};
			}else{
				let bothTr = {};
				Object.keys(allDatesTr).forEach(function(d){
					bothTr[d] = allDatesTr[d];
				});
				Object.keys(incomeDatesTr).forEach(function(d){
					bothTr[d] = incomeDatesTr[d];
				});
				Object.keys(bothTr).sort().reverse().some(function(d){
					if(offset<=countAll){
						if(count<limit){
							if(typeof bothTr[d]=='string'){
								tb += bothTr[d];
							};
							if(typeof bothTr[d]=='object'){
								tb += bothTr[d]['tr'];
							};
							count++;
						}else{
							return true;
						};
					};
					countAll++;
				});
			};
			
			if(tb){
				if(count==limit){
					tb += list.draw.add();
				};
				if(!offset)	tb += '</table>';
			};
			let f = (function(both,ld,rd,spend,income,offset,tb){
				return function(){
					list.draw.insert(tb,offset);
					let bu = document.querySelector('#strings button[extra]');
					if(bu){
						let f2 = (function(both,ld,rd,spend,income){
							return function(){
								let bu = document.querySelector('#strings button[extra]');
								if(bu){
									let trCount = document.querySelectorAll('#strings table tr[id]');
									if(trCount && trCount.length>0){
										let li = bu.querySelector('span');
										if(li){
											let limit = li.innerHTML;
											if(limit){
												expenses.get(both,ld,rd,spend,income,trCount.length,limit*1);
											};
										};
									};
								};
							};
						})(both,ld,rd,spend,income);
						bu.addEventListener('click',f2);
					};
				};
			})(both,ld,rd,spend,income,offset,tb);
			if(offset){
				f();
			};
		ret = {spends:spends,incomes:incomes,f:f};
	};
	return ret;
};
expenses.date = function(d){
	return (d+'').substr(0,19).replace(/[^0-9]/g,'')*1;
};
expenses.date.byName = function(name){
	let ret = '';
	let now = (new Date().getTime());
	let minus = 0;
	if(name=='week')	minus = 1000*60*60*24*7;
	if(name=='3months')	minus = 1000*60*60*24*30*3;
	if(name=='year')	minus = 1000*60*60*24*365;
	if(name=='3years')	minus = 1000*60*60*24*365*3;
	if(name=='all')		minus = 1000*60*60*24*365*100;
	if(minus){
		ret = ct2.date('',(now - minus));
	}else{
		let now2 = ct2.date();
		if(name=='thisMonth'){
			ret = now2.substr(0,7)+'-01 00:00:00';
		};
		if(name=='thisYear'){
			ret = now2.substr(0,4)+'-01-01 00:00:00';
		};
		
		if (name == 'month') {
			let day = +now2.substring(8, 10)
			let minusDate = ct2.date('', (now - 1000*60*60*24*25))
			if (day > 15) {
				minusDate = ct2.date('', (now - 1000*60*60*24*35))
			}
			let yearMonthBefore = minusDate.substring(0, 7)
			ret = ct2.date('').replace(/^[0-9]+\-[0-9]+(\-.+)$/, yearMonthBefore + '$1')
		}
	}
	return ret;
};