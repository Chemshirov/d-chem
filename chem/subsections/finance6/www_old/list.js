var list = {};
list.sum = 0;

list.draw = function(source,offset,limit,c,act,curr,together){
	if(!offset && !limit && !c && !act && !curr && !together){
		document.title = 'Finance6: ' + 'list';
	};
	let ret = false;
	if(!(c || act)){
		list.draw.clear(offset);
	}
	if(!offset)	offset = 0;
	if(!limit)	limit = 100;
	
	let name = data['name'];
	if(name){
		let o = data['base'];
		if(o && typeof o=='object'){
			let arr = Object.keys(o).sort().reverse();
			list.count();
			let selectedItems = document.querySelector('#strings table tr[s]');
			if(!selectedItems){
				let strings = document.querySelector('#strings');
				if(strings){
					let tb = '';
					if(!offset)	tb += list.draw.tableTag(true);
					let countLimit = 0;
					let offsetLimit = 0;
					arr.some(function(e,i){
						if(countLimit<limit){
							let cf = o[e]['cf']?o[e]['cf']:name;
							let f = o[e]['f'];
							let ct = o[e]['ct']?o[e]['ct']:name;
							let t = o[e]['t'];
							let cu = o[e]['c']?o[e]['c']:'руб.';
							
							let cuIf = (curr==cu || !curr);
							if(curr && typeof curr=='object'){
								cuIf = false;
								curr.some(function(a){
									if(cu==a || !a){
										cuIf = true;
										return true;
									};
								});
							};
							
							let cIf = (cf==c || ct==c);
							if(c && typeof c=='object'){
								cIf = false;
								c.some(function(a){
									if(cf==a || ct==a){
										cIf = true;
										return true;
									};
								});
							};
							let companyIf = ((c && cIf && cuIf) || !c);
							
							let aIf = (f==act || t==act);
							if(act && typeof act=='object'){
								aIf = false;
								act.some(function(a){
									if(f==a || t==a){
										aIf = true;
										return true;
									};
								});
							};
							let actIf = ((act && aIf && cuIf) || !act);
							
							let mainIf = (companyIf && actIf);
							if(together){
								mainIf = (cIf || aIf);
							};
								
							if( mainIf ){
								if(offsetLimit>=offset){
									tb += list.draw.tr(o,e);
									countLimit++;
								};
								offsetLimit++;
							};
						}else{
							return true;
						};
					});
					if(tb){
						if(countLimit==limit){
							tb += list.draw.add();
						};
						if(!offset)	tb += list.draw.tableTag();
					};
					ret = list.draw.insert(tb,offset,source);
				};
				let bu = document.querySelector('#strings button[extra]');
				if(bu){
					let trCount = document.querySelectorAll('#strings table tr[id]');
					if(trCount && trCount.length>0){
						if(list.draw.click2extra.FS){
							bu.removeEventListener('click',list.draw.click2extra.FS);
						};
						list.draw.click2extra.FS = list.draw.click2extra(bu,trCount.length,c,act,curr);
						bu.addEventListener('click',list.draw.click2extra.FS);
					};
				};
				if(!(c || act || curr)){
					obj.activateButtons.setColor('list');
				};
				list.activateButtons();
			};
		};
	}else{
		login.ini();
	};
	return ret;
};
list.draw.click2extra = function(bu,trCountLength,c,act,curr){
	return (function(bu,count,c,act,curr){
		return function(){
			let li = bu.querySelector('span');
			if(li){
				let limit = li.innerHTML;
				if(limit){
					list.draw('button[extra] click',count,limit,c,act,curr);
				};
			};
		};
	})(bu,trCountLength,c,act,curr);
};
list.draw.tableTag = function(begin){
	let html = '<table class="table table-striped table-hover">';
	if (!begin) {
		html = '</table>';
	};
	return html;
};
list.draw.tr = function(o,e){
	let cf = o[e]['cf']?o[e]['cf']:data['name'];
	let f = o[e]['f'];
	let ct = o[e]['ct']?o[e]['ct']:data['name'];
	let t = o[e]['t'];
	let it = o[e]['i']?o[e]['i']:'E';
	let cu = o[e]['c']?o[e]['c']:'руб.';
	let tr = '';
		tr += '<tr id="'+e+'">';
			tr += '<td edit>';
				tr += '<button type="button" class="btn btn-success btn-sm">&#x2630;</button>';
			tr += '</td>';
			tr += '<td cf>';
				tr += cf;
			tr += '</td>';
			tr += '<td f>';
				tr += f;
			tr += '</td>';
			tr += '<td d>';
				tr += list.date(e);
			tr += '</td>';
			tr += '<td ct>';
				tr += ct;
			tr += '</td>';
			tr += '<td t>';
				tr += t;
			tr += '</td>';
			tr += '<td it="'+it+'">';
				tr += it;
			tr += '</td>';
			tr += '<td a>';
				tr += o[e]['a'];
			tr += '</td>';
			tr += '<td cu>';
				tr += cu;
			tr += '</td>';
			tr += '<td co>';
				tr += '<span>'+list.draw.tr.media(o[e]['me'])+o[e]['co']+'</span>';
			tr += '</td>';
		tr += '</tr>'
	return tr;
};
list.draw.tr.media = function(media){
	let ret = '';
	if(media && typeof media=='object'){
		let html = '';
		Object.keys(media).sort().forEach(function(u){
			let ext = (u+'').replace(/.+(\.[^\.]+)$/,'$1');
			html += '<a href="https://chemshirov.ru/media/'+u+'" target="_blank">';
			html += 	ext;
			html += '</a>';
		});
		if(html)	ret = html;
	};
	return ret;
};

list.draw.add = function(){
	let tr = '';
		tr += '<tr add>';
			tr += '<td colspan="10">';
			tr += 	'<button extra type="button" class="btn btn-warning">';
			tr += 		'Get <span>500</span> or less strings more';
			tr += 	'</button>';
			tr += '</td>';
		tr += '</tr>';
	return tr;
};
list.draw.insert = function(tb,offset,source){
	let ret = false;
	let strings = document.querySelector('#strings');
	if(strings){
		let buttonExtra = false;
		if(source && source=='button[extra] click'){
			buttonExtra = true;
		};
		let se = document.querySelectorAll('#strings table tr.selected');
		if(se && se.length>0 && !buttonExtra){
			if(strings.getAttribute('md5')!=data['shortMD5']){
				strings.setAttribute('r','');
			};
		}else{
			if(!buttonExtra){
				strings.removeAttribute('r');
			};
			if(!offset){
				strings.setAttribute('md5',data['shortMD5']);
				strings.innerHTML = tb;
			}else{
				let last = document.querySelector('#strings table tr:nth-last-of-type(1)');
				if(last){
					if(tb){
						last.insertAdjacentHTML('afterend', tb);
						let td = last.querySelector('td');
						if(td){
							td.innerHTML = '';
						};
					}else{
						last.remove();
					};
				};
			};
			ret = true;
		};
	};
	let tr = document.querySelectorAll('#strings tr[id]');
	if(tr){
		tr.forEach(function(i){
			let f = (function(i){
				return function(){
					list.draw.insert.clickFunction(i);
				};
			})(i);
			if(!list.draw.insert.FS)	list.draw.insert.FS = {};
			try{
				let id = i.getAttribute('id');
				if(list.draw.insert.FS[id]){
					i.removeEventListener('click',list.draw.insert.FS[id]);
				};
				list.draw.insert.FS[id] = f;
				i.addEventListener('click',list.draw.insert.FS[id]);
			}catch(e){};
		});
	};
	list.activateButtons();
	return ret;
};
list.draw.insert.clickFunction = function(i){
	if((/selected/).test(i.className)){
		i.classList.remove('selected');
	}else{
		i.className += 'selected';
	};
	list.showSum();
};

list.draw.clear = function(clearAll){
	let strings = document.querySelector('#strings');
	if(strings){
		let se = document.querySelectorAll('#strings table tr.selected');
		if(se && se.length>0 && !clearAll){
			if(strings.getAttribute('md5')!=data['shortMD5']){
				strings.setAttribute('r','');
			};
		}else{
			strings.removeAttribute('r');
			strings.innerHTML = '';
		};
	};
	
	let results = document.querySelector('#results');
	if(results){
		if(results.querySelector('[left]')){
			results.querySelector('[left]').innerHTML = '';
		};
		if(results.querySelector('[right]')){
			results.querySelector('[right]').innerHTML = '';
		};
		if(results.querySelector('[total]')){
			results.querySelector('[total]').innerHTML = '';
		};
		results.removeAttribute('expenses');
		results.removeAttribute('search');
		results.removeAttribute('input');
		results.removeAttribute('logs');
	};
	let searchInput = document.querySelector('#buttons input.search');
	if (searchInput) {
		searchInput.value = '';
	};
};

list.count = function(){
	let o = data['base'];
	if(o && typeof o=='object'){
		let count = Object.keys(o).length;
		if(count){
			let l = document.querySelector('#buttons button[a="list"]');
			if(l){
				let c = l.querySelector('span.count');
				if(c){
					c.innerHTML = count;
				};
			};
		};
	};
};
list.inputType = function(it){
	let ret = 'E';
	if(it.length==8){
		ret = 'A';
	};
	return ret;
};
list.date = function(d){
	return '<span>'+(d+'').substr(0,19).replace(' ','</span> <span>')+'</span>';
};
list.showSum = function(){
	list.sum = 0;
	let s = document.querySelectorAll('#strings tr.selected');
	if(s){
		s.forEach(function(i){
			let amount = (i.querySelector('td[a]').innerHTML+'')*1;
			let curr = (i.querySelector('td[cu]').innerHTML+'');
			let date = (i.querySelector('td[d]').innerHTML+'').replace(/\<span\>/g,'').replace(/\<\/span\>/g,'');
			let rate = data.rate(curr,date);
			list.sum += amount*rate;
		});
		let html = list.sum?'<span>'+s.length+': </span><span>'+Math.round(list.sum*100)/100+'</span>':'';
		let sum = document.querySelector('#main #sum');
		if(sum){
			sum.innerHTML = html;
		};
	};
};

list.activateButtons = function(){
	let bs = document.querySelectorAll('#strings tr[id]>td[edit]>button');
	if(bs){
		bs.forEach(function(i){
			i.addEventListener('click',function(e){
				e.stopPropagation();
				try{
					let id = i.closest('tr[id]').getAttribute('id');
					obj.activateButtons.click(document.querySelector('#buttons button[a="input"]'),id)
					input.draw({source:'list.activateButtons.click',id:id});
				}catch(e){};
			});
		});
	};
};