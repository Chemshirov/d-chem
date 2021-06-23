var actives = {};

actives.draw = function(source){
	obj.activateButtons.setColor('actives');
	list.count();
	list.draw.clear();
	actives.show(source);
	document.title = 'Finance6: ' + 'actives';
};
actives.show = function(source){
	let o = data['base'];
	if (o) {
		let r = document.querySelector('#results');
		if(r){
			r.removeAttribute('expenses');
			r.removeAttribute('input');
		};
		let a = actives.get();
		actives.show.a = a;
		actives.show.resources(a['resources']);
		actives.show.debts(a['debts']);
		actives.show.subtotalsHights();
		actives.show.total();
		actives.show.strings(a);
		if(source!='button'){
			actives.reclickOnRefresh();
		};
	};
};
actives.show.resources = function(r){
	let subtotal = 0;
	let l = document.querySelector('#results div[left]');
	if(l){
		let tb = '<table class="table table-sm">';
			tb += '<caption>';
			tb += 	'<button type="button" class="btn btn-lg btn-outline-primary" resources>Resources</button>';
			tb += '</caption>';
		let c = false;
		if(r){
			let date = '';
			if(data['currencies'] && data['currencies']['date']){
				date = data['currencies']['date'];
			};
			Object.keys(r).forEach(function(curr){
				Object.keys(r[curr]).forEach(function(n){
					let hoverC = '<div>';
						hoverC += 	'<div ra>* '+r[curr][n]['ra']+' руб. &#x2248; '+r[curr][n]['ru']+' руб.</div>';
						if(date)	hoverC += 	'<div d>'+date+'</div>';
						hoverC += '</div>';
					if(r[curr][n]['ra']==1){
						hoverC = '';
					};
					let deposits = ((/[0-9]{4,}/).test(n)?true:false);
					tb += '<tr'+(c!=curr?' pt':'')+(deposits?' dep':'')+'>';
					tb += 	'<td><span>'+n+'</span></td>';
					tb += 	'<td><span>'+r[curr][n]['a']+'</span></td>';
					tb += 	'<td><span>'+curr+'</span><span c>'+hoverC+'</span></td>';
					tb += '</tr>';
					subtotal += (deposits?0:r[curr][n]['ru']);
					c = curr;
				});
			});
		};
		tb += '<tr subtotal><td></td><td>'+subtotal+'</td><td>руб.</td></tr>';
		tb += '</table>';
		l.innerHTML = tb;
		
		if(!actives.show['subtotals'])	actives.show['subtotals'] = {};
		actives.show['subtotals']['left'] = subtotal;
		
		actives.show.click();
		actives.show.click.buttons(false,{resources:r});
	};
};
actives.show.debts = function(r){
	let subtotal = 0;
	let l = document.querySelector('#results div[right]');
	if(l){
		let tb = '<table class="table table-sm">';
			tb += '<caption>';
			tb += 	'<button type="button" class="btn btn-lg btn-outline-primary" debts>Debts</button>';
			tb += '</caption>';
		let cu = false;
		if(r){
			Object.keys(r).forEach(function(curr){
				Object.keys(r[curr]).forEach(function(c){
					tb += '<tr'+(cu!=curr?' pt':'')+'>';
					tb += 	'<td><span>'+c+'</span></td>';
					tb += 	'<td><span>'+r[curr][c]['a']+'</span></td>';
					tb += 	'<td><span>'+curr+'</span></td>';
					tb += '</tr>';
					subtotal += r[curr][c]['ru'];
					cu = curr;
				});
			});
		};
		tb += '<tr subtotal><td></td><td>'+subtotal+'</td><td>руб.</td></tr>';
		tb += '</table>';
		l.innerHTML = tb;
		
		if(!actives.show['subtotals'])	actives.show['subtotals'] = {};
		actives.show['subtotals']['right'] = subtotal;
		
		actives.show.click('right');
		actives.show.click.buttons('right',{debts:r});
	};
};
actives.show.subtotalsHights = function(){
	let tbl = document.querySelector('#results div[left]>table');
	let tbr = document.querySelector('#results div[right]>table');
	if(tbl && tbr){
		let lastTd = document.querySelector('#results div[right]>table tr:nth-last-of-type(2)>td');
		if(lastTd){
			let pb = 0;
			try{
				pb = window.getComputedStyle(lastTd,null).getPropertyValue('padding-bottom').replace('px','')*1;
			}catch(e){};
			if(pb){
				let lh = tbl.scrollHeight;
				let rh = tbr.scrollHeight;
				let a = 0;
				let right = true;
				if(lh<rh){
					a = ((rh - lh) + pb);
					right = false;
				}else{
					a = ((lh - rh) + pb);
				};
				if(a && a>0){
					let s = '#results div['+(right?'right':'left')+']>table tr:nth-last-of-type(2)>td';
					let target = document.querySelector(s);
					if(target){
						target.style.paddingBottom = a+'px';
					};
				};
			};
		};
	};
};
actives.show.subtotal = function(left,name,curr){
	if(left){
		let s = document.querySelector('#results div['+left+']>table tr[subtotal]>td:nth-of-type(2)');
		if(s){
			if(name || curr){
				let amount = 0;
				let a = actives.show.a;
				if(a && typeof a=='object'){
					let b = actives.show.a[left=='left'?'resources':'debts'];
					if(b && typeof b=='object'){
						Object.keys(b).forEach(function(cu){
							let c = cu;
							if(!c)	c='руб.';
							if(c==curr || !curr){
								Object.keys(b[cu]).forEach(function(n){
									if(n==name || !name){
										amount += b[cu][n]['ru'];
									};
								});
							};
						});
					};
				};
				s.innerHTML = amount;
				s.setAttribute('b','');
			}else{
				if(actives.show['subtotals']){
					if(actives.show['subtotals'][left]){
						s.innerHTML = actives.show['subtotals'][left];
						s.setAttribute('b','');
					};
				};
			};
		};
	};
};
actives.show.total = function(){
	let l = document.querySelector('#results div[left]>table tr[subtotal]>td:nth-of-type(2)');
	let r = document.querySelector('#results div[right]>table tr[subtotal]>td:nth-of-type(2)');
	if(l && r){
		let la = (l.innerHTML+'').replace(/[^0-9]/,'')*1;
		let ra = (r.innerHTML+'').replace(/[^0-9]/,'')*1;
		let a = (la - ra);
		let t = document.querySelector('#results div[total]');
		if(t){
			let html = '<div class="d-flex align-items-center">';
				html += 	'<div class="btn-outline-primary">';
				html += 		'<input class="form-control" type="text" value="'+(actives.dateTill||ct2.date())+'">';
				html += 	'</div>';
				html += 	'<span t>'+a+'&nbsp;руб.</span>';
				html += 	'<button class="btn btn-outline-primary" type="button">Set current date</button>';
				html += '</div>';
			t.innerHTML = html;
			actives.show.total.inputChange();
		};
	};
};
actives.show.total.inputChange = () => {
	let textInput = document.querySelector('#results div[total] input[type="text"]');
	if (textInput) {
		textInput.addEventListener('input', () => {
			if (textInput.value.length == 19) {
				actives.dateTill = textInput.value;
				actives.show('actives.show.total.inputChange');
			};
		});
	};
	let button = document.querySelector('#results div[total] button');
	if (button) {
		button.addEventListener('click', () => {
			actives.dateTill = false;
			actives.show('actives.show.total.inputChange now');
		});
	};
};

actives.show.clearBold = function(){
	let bold = document.querySelectorAll('#results table td>span[b]');
	if(bold){
		bold.forEach(function(i){
			i.removeAttribute('b');
		});
	};
	let butts = document.querySelectorAll('#results table caption>button.btn-primary');
	if(butts){
		butts.forEach(function(e){
			let classes = e.getAttribute('class');
			if(classes){
				e.setAttribute('class',(classes+'').replace('btn-primary','btn-outline-primary'));
			};
		});
	};
	let l = document.querySelector('#results div[left]>table tr[subtotal]>td:nth-of-type(2)');
	if(l)	l.removeAttribute('b');
	let r = document.querySelector('#results div[right]>table tr[subtotal]>td:nth-of-type(2)');
	if(r)	r.removeAttribute('b');
};
actives.show.click = function(right){
	let left = 'left';
	if(right)	left = 'right';
	
	let first = document.querySelectorAll('#results div['+left+'] table tr:not([subtotal])>td:nth-of-type(1)>span');
	if(first){
		first.forEach(function(i){
			i.addEventListener('click',function(e){
				if(e && e['isTrusted']){
					actives.show.click.clearSelected();
				};
				if(i.innerHTML){
					let act = i.innerHTML;
					actives.show.click['item'] = {a:act};
					let ok = false;
					if(!right){
						ok = list.draw('actives.show.click first left',0,100,false,act);
					}else{
						ok = list.draw('actives.show.click first right',0,100,act);
					};
					if(ok){
						let s = '#results div['+left+'] table tr:not([subtotal])>td:nth-of-type(1)>span';
						let qa = document.querySelectorAll(s);
						if(qa){
							actives.show.clearBold();
							qa.forEach(function(e){
								if(e.innerHTML==act){
									e.setAttribute('b','');
								};
							});
							actives.show.subtotal(left,act);
						};
					};
				};
			});
		});
	};
	
	let amount = document.querySelectorAll('#results div['+left+'] table tr:not([subtotal])>td:nth-of-type(2)>span');
	if(amount){
		amount.forEach(function(i){
			i.addEventListener('click',function(e){
				if(e && e['isTrusted']){
					actives.show.click.clearSelected();
				};
				let ok = false;
				let td = i.parentElement;
				if(td){
					let tr = td.parentElement;
					if(tr){
						let act = tr.querySelector('td:nth-of-type(1)>span');
						let curr = tr.querySelector('td:nth-of-type(3)>span');
						let cu = '';
						if(act){
							if(act.innerHTML){
								if(curr){
									cu = curr.innerHTML;
									let a = act.innerHTML;
									if(!cu)		cu='руб.';
									actives.show.click['item'] = {a:a,c:cu};
									if(!right){
										ok = list.draw('actives.show.click amount left',0,100,false,a,cu);
									}else{
										ok = list.draw('actives.show.click amount right',0,100,a,false,cu);
									};
								};
							};
						};
						if(ok){
							actives.show.clearBold();
							i.setAttribute('b','');
							if(act){
								actives.show.subtotal(left,act.innerHTML,cu);
							};
						};
					};
				};
			});
		});
	};
	
	let currs = document.querySelectorAll('#results div['+left+'] table tr:not([subtotal])>td:nth-of-type(3)');
	if(currs){
		currs.forEach(function(i){
			i.addEventListener('click',function(e){
				if(e && e['isTrusted']){
					actives.show.click.clearSelected();
				};
				let ok = false;
				let span = i.querySelector('span');
				if(span){
					let s = span.innerHTML;
					if(s){
						let curr = (s+'').replace(/<div.+div>/,'');
						if(curr){
							let cs = [];
							let qa = document.querySelectorAll('#results div['+left+'] table tr:not([subtotal])>td:nth-of-type(3)');
							if(qa){
								qa.forEach(function(e){
									let span = e.querySelector('span');
									if(span){
										let s = span.innerHTML;
										if(s){
											let curr2 = (s+'').replace(/<div.+div>/,'');
											if(curr2==curr){
												let tr = e.parentElement;
												if(tr){
													let c = tr.querySelector('td:nth-of-type(1)>span');
													if(c){
														if(c.innerHTML){
															cs.push(c.innerHTML);
														};
													};
												};
												if(ok)	span.setAttribute('b','');
											};
										};
									};
								});
							};
							actives.show.click['item'] = {c:curr};
							if(!right){
								ok = list.draw('actives.show.click currs left',0,100,false,cs,curr);
							}else{
								ok = list.draw('actives.show.click currs right',0,100,cs,false,curr);
							};
							if(ok){
								if(qa){
									actives.show.clearBold();
									qa.forEach(function(e){
										let span = e.querySelector('span');
										if(span){
											let s = span.innerHTML;
											if(s){
												let curr2 = (s+'').replace(/<div.+div>/,'');
												if(curr2==curr){
													span.setAttribute('b','');
												};
											};
										};
									});
									actives.show.subtotal(left,'',curr);
								};
							};
						};
					};
				};
			});
		});
	};
};
actives.show.click.clearSelected = function(){
	let se = document.querySelectorAll('#strings table tr.selected');
	if(se && se.length>0){
		se.forEach(function(e){
			if((/selected/).test(e.className)){
				e.classList.remove('selected');
			};
		});
		let su = document.querySelector('#sum');
		if(su){
			su.innerHTML = '';
		};
	};
};
actives.show.click.buttons = function(right,a){
	let left = 'left';
	if(right)	left = 'right';
	let butt = document.querySelector('#results div['+left+']>table caption>button');
	if(butt){
		let f = (function(a,butt,left){
			return function(){
				let ok = actives.show.strings(a);
				if(ok){
					actives.show.clearBold();
					let classes = butt.getAttribute('class');
					if(classes){
						butt.setAttribute('class',(classes+'').replace('btn-outline-','btn-'));
						actives.show.subtotal(left);
						actives.show.click['item'] = {b:left};
					};
				}
			};
		})(a,butt,left);
		butt.addEventListener('click',f);
	};
};

actives.show.strings = function(a){
	let companies = {};
	let acts = {};
	let curr = {};
	if(a && typeof a=='object'){
		if(a['resources']){
			Object.keys(a['resources']).forEach(function(cu){
				curr[cu] = true;
				Object.keys(a['resources'][cu]).forEach(function(act){
					acts[act] = true;
				});
			});
		};
		if(a['debts']){
			Object.keys(a['debts']).forEach(function(cu){
				curr[cu] = true;
				Object.keys(a['debts'][cu]).forEach(function(c){
					companies[c] = true;
				});
			});
		};
	};
	let co = Object.keys(companies);
	let ac = Object.keys(acts);
	let cu = Object.keys(curr);
	return list.draw('actives.show.strings', 0,0,co.length?co:'',ac.length?ac:'',cu.length?cu:'','together');
};

actives.reclickOnRefresh = function(){
	let o = actives.show.click['item'];
	let td1 = '';
	let td2 = '';
	if(o){
		if(o['a']){
			let s = document.querySelectorAll('#results table td:nth-of-type(1)>span');
			if(s && s.length>0){
				s.forEach(function(e){
					if(e.innerHTML==o['a']){
						if(o['c']){
							let tr = e.parentElement.parentElement;
							if(tr){
								let s = tr.querySelector('td:nth-of-type(3)>span');
								if(s){
									if(s.innerHTML==(o['c']+'').replace('руб.','')){
										td1 = e;
									};
								};
							};
						}else{
							td1 = e;
						};
					};
				});
			};
		};
		if(o['c']){
			let s = document.querySelectorAll('#results table td:nth-of-type(3)>span');
			if(s && s.length>0){
				s.forEach(function(e){
					if(e.innerHTML==o['c']){
						td2 = e;
					};
				});
			};
		};
		if(td1 && (td2 || o['c'])){
			let tr = td1.parentElement.parentElement;
			if(tr){
				let s = tr.querySelector('td:nth-of-type(2)>span');
				if(s){
					s.click();
				};
			};
		}else{
			if(td1){
				td1.click();
			};
			if(td2){
				td2.click();
			};
		};
		
		if(o['b']){
			let butt = document.querySelector('#results div['+o['b']+']>table caption>button');
			if(butt){
				butt.click();
			};
		};
	};
};

actives.get = function(){
	let ret = {};
	let cache = data.cache('actives' + (actives.dateTill||''));
	if(cache){
		ret = cache;
	}else{
		let o = data['base'];
		if(o && data['name']){
			let amount = 0;
			let activesObj = {};
			let allActives = {};
			let activesCount = {};
			let types = {};
			let debtsObj = {};
			let debtsMayBeSalary = {};
			Object.keys(o).sort().reverse().forEach(function(e,i){
				if (!actives.dateTill || (actives.dateTill && (e + '').substring(0, 19) < actives.dateTill)) {
					let cu = o[e]['c'];
					if(!cu)	cu = '';
					let amount = (o[e]['a']+'')*1;
					
					if(o[e]['cf']==data['name'] || o[e]['ct']==data['name'] || !o[e]['cf'] || !o[e]['ct']){
						if(!activesObj[cu])	activesObj[cu] = {};
						let c = activesObj[cu];
						
						if(o[e]['cf']==data['name'] || !o[e]['cf']){
							if(o[e]['f'] && (o[e]['f']+'').length>0){
								if(1 || amount>0){
									if( !((o[e]['ct']==data['name'] || !o[e]['ct']) && o[e]['f']==o[e]['t']) ){
										if(!c[o[e]['f']])	c[o[e]['f']] = 0;
										c[o[e]['f']] -= amount;
										if(!activesCount[o[e]['f']])	activesCount[o[e]['f']] = 0;
										activesCount[o[e]['f']]++;
									};
								};
								if(!types['actives'])		types['actives'] = {};
								if(!types['actives'][cu])	types['actives'][cu] = {};
								types['actives'][cu][o[e]['f']] = true;
							};
						};
						if(o[e]['ct']==data['name'] || !o[e]['ct']){
							if(!c[o[e]['t']])	c[o[e]['t']] = 0;
							c[o[e]['t']] += amount;
							if(!activesCount[o[e]['t']])	activesCount[o[e]['t']] = 0;
							activesCount[o[e]['t']]++;
						};
						
						if(!allActives[cu])	allActives[cu] = {};
						let aa = allActives[cu];
						if(o[e]['cf']==data['name'] || !o[e]['cf']){
							if(!aa[o[e]['f']])	aa[o[e]['f']] = {};
							aa[o[e]['f']][o[e]['i']] = true;
						};
						if(o[e]['ct']==data['name'] || !o[e]['ct']){
							if(!aa[o[e]['t']])	aa[o[e]['t']] = {};
							aa[o[e]['t']][o[e]['i']] = true;
						};
					};
					if( (o[e]['cf'] && o[e]['cf']!=data['name']) || (o[e]['ct'] && o[e]['ct']!=data['name']) ){
						if(!debtsObj[cu])	debtsObj[cu] = {};
						let d = debtsObj[cu];
						if( (o[e]['cf'] && o[e]['cf']!=data['name']) && (!o[e]['ct'] || o[e]['ct']==data['name']) ){
							if(!debtsObj[cu][o[e]['cf']])	debtsObj[cu][o[e]['cf']] = 0;
							debtsObj[cu][o[e]['cf']] += amount;
						};
						if( (o[e]['ct'] && o[e]['ct']!=data['name']) && (!o[e]['cf'] || o[e]['cf']==data['name']) ){
							if(!debtsObj[cu][o[e]['ct']])	debtsObj[cu][o[e]['ct']] = 0;
							debtsObj[cu][o[e]['ct']] -= amount;
						};
						if( (o[e]['cf'] && o[e]['cf']!=data['name']) && (!o[e]['ct'] || o[e]['ct']==data['name']) ){
							if(!o[e]['i'] && o[e]['t']){
								if(!debtsMayBeSalary[cu])		debtsMayBeSalary[cu] = {};
								let s = debtsMayBeSalary[cu];
								if(!s[o[e]['cf']])				s[o[e]['cf']] = {};
								if(!s[o[e]['cf']][o[e]['t']])	s[o[e]['cf']][o[e]['t']] = 0;
								s[o[e]['cf']][o[e]['t']] += amount;
							};
						};
					};
				};
			});
			if(activesObj){
				Object.keys(activesObj).sort().forEach(function(curr){
					if(types['actives'][curr]){
						Object.keys(activesObj[curr]).sort().forEach(function(act,i){
							if(types['actives'][curr][act]){
								let if01 = (allActives[curr][act] && Object.keys(allActives[curr][act]).length>1);
								let if02 = (activesCount[act] == 1);
								if (if01 || if02) {
									let a = Math.round(activesObj[curr][act]*100)/100;
									if(a && (a>1 || a<-1)){
										let rate = data.rate(curr);
										let am = actives.getRound(a);
										let ru = Math.round(a*rate);
										let ra = actives.getRound(rate);
										if(!ret['resources'])	ret['resources'] = {};
										if(!ret['resources'][curr])	ret['resources'][curr] = {};
										ret['resources'][curr][act] = {a:am,ru:ru,ra:ra};
									};
								};
							};
						});
					};
				});
			};
			if(debtsObj){
				let debtsMayBeSalary2 = {};
				if(debtsMayBeSalary){
					Object.keys(debtsMayBeSalary).forEach(function(curr){
						if(types['actives'][curr]){
							Object.keys(debtsMayBeSalary[curr]).forEach(function(c){
								Object.keys(debtsMayBeSalary[curr][c]).forEach(function(act){
									if(allActives[curr][act] && Object.keys(allActives[curr][act]).length>1){
										if(!debtsMayBeSalary2[curr])	debtsMayBeSalary2[curr] = {};
										if(!debtsMayBeSalary2[curr][c])	debtsMayBeSalary2[curr][c] = 0;
										debtsMayBeSalary2[curr][c] += debtsMayBeSalary[curr][c][act];
									};
								});
							});
						};
					});
				};
				
				
				Object.keys(debtsObj).sort().forEach(function(curr){
					let rate = data.rate(curr);
					Object.keys(debtsObj[curr]).sort().forEach(function(c){
						let a = Math.round(debtsObj[curr][c]*100)/100;
						if( !(a<1 && a>-1) ){
							let as = 0;
							if(debtsMayBeSalary2 && debtsMayBeSalary2[curr] && debtsMayBeSalary2[curr][c]){
								as = debtsMayBeSalary2[curr][c];
							};
							let am = actives.getRound(a-as);
							let ru = Math.round((a-as)*rate);
							let ra = actives.getRound(rate);
							if( !(am<1 && am>-1) ){
								if(!ret['debts'])			ret['debts'] = {};
								if(!ret['debts'][curr])		ret['debts'][curr] = {};
								ret['debts'][curr][c] = {a:am,ru:ru,ra:ra};
							};
						};
					});
				});
			};
			data.cache('actives', ret);
		};
	};
	return ret;
};
actives.getRound = function(amount){
	let round = 100;
	if(amount<1){
		let n = (amount+'').replace(/^([0\.]+)(.*)/,'$1').replace(/[^0]/g,'').length;
		round = Math.pow(10,n)*1000;
	};
	let ret = Math.round((amount+'').replace(/[^0-9\.\-]/g,'')*round)/round;
	if(!(/\./).test(ret))				ret = ret+'.00';
	if((/^[0-9\-]+\.[0-9]$/).test(ret))	ret = ret+'0';
	return ret;
};