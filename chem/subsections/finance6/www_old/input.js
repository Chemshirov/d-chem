var input = {};

input.draw = function(source){
	list.count()
	if (source != 'data.save') {
		obj.activateButtons.setColor('input');
		list.draw.clear(true);
		let id = false;
		if(source && typeof source=='object' && source['id']){
			id = source['id'];
		};
		let force = (source=='button input'?true:false);
		input.html(id, force);
	}
};

input.html = function(date,force){
	let edit = {};
	try{
		if(data['base'][date]){
			edit = data['base'][date];
		};
	}catch(e){};
	
	
	let getO = input.html.getO()['obj01'];
	let cf = input.html.sort(getO);
	let cf0 = edit['cf']||cf[0]||data['name'];
	let f = input.html.sort(getO[cf0]);
	let getO2 = input.html.getO()['obj02'];
	let ct = input.html.sort(getO2);
	let ct0 = edit['ct']||ct[0]||data['name'];
	let t = input.html.sort(getO2[ct0]);
	let comm = input.html.sort(input.html.getO()['obj03']);
	
	let html = '';
		html += '<div>';
		html += 	'<div from>';
		html += 		'<div c>';
		html += 			'<div class="btn-toolbar justify-content-start flex-nowrap">';
		html += 				'<div class="input-group mr-3 btn-outline-primary" f>';
		html +=						input.html.inputGroup('Actives',edit['f']||false,'f',f);
		html += 				'</div>';
		html += 				'<div class="input-group" cf>';
		html +=						input.html.inputGroup('From-name',cf0,'cf',cf);
		html += 				'</div>';
		html += 			'</div>';
		html += 		'</div>';
		html += 		'<div fb>';
		html += 			'<div>';
		html += 				input.html.buttons('primary',f);
		html += 			'</div>';
		html += 		'</div>';
		html += 	'</div>';
		html += 	'<div amount>';
		html += 		'<div class="btn-toolbar justify-content-around flex-nowrap">';
		html += 			'<div class="input-group mr-3">';
		html += 				'<input am type="number" class="form-control" ';
		html += 					'placeholder="Amount"'+(edit['a']?' value="'+edit['a']+'"':'')+'>';
		html += 				'<div class="input-group-append">';
		html += 					'<button calc class="btn btn-outline-secondary" type="button">Calc</button>';
		html += 				'</div>';
		html += 				'<input cu type="text" class="form-control" ';
		html += 					'placeholder="Currency"'+(edit['c']?' value="'+edit['c']+'"':'')+'>';
		html += 				input.html.currencies();
		html += 			'</div>';
		html += 			'<div class="input-group">';
		html += 				input.html.date(date);
		html += 			'</div>';
		html += 		'</div>';
		html += 	'</div>';
		html += 	'<div to>';
		html += 		'<div tb>';
		html += 			'<div>';
		html += 				input.html.buttons('danger',t);
		html += 			'</div>';
		html += 		'</div>';
		html += 		'<div c>';
		html += 			'<div class="btn-toolbar justify-content-start flex-nowrap">';
		html += 				'<div class="input-group mr-3 btn-outline-primary" t>';
		html +=						input.html.inputGroup('Spends',edit['t']||false,'t',t);
		html += 				'</div>';
		html += 				'<div class="input-group" ct>';
		html +=						input.html.inputGroup('To-name',ct0,'ct',ct);
		html += 				'</div>';
		html += 			'</div>';
		html += 		'</div>';
		html += 	'</div>';
		html += 	'<div comments>';
		html += 		'<div comm>';
		html += 			input.html.buttons('secondary',comm);
		html += 		'</div>';
		html += 		'<div class="input-group dropup">';
		html += 			'<div class="dropdown-menu"></div>';
		html +=				input.html.inputGroup('Comment',edit['co']||false,'comm',comm);
		html += 		'</div>';
		html += 	'</div>';
		html += 	'<div save>';
		html += 		'<div class="btn-toolbar justify-content-around flex-nowrap">';
		html += 			addMedia.html(date);
		html += 			'<div class="input-group justify-content-around">';
		html += 				'<button a type="button" class="btn ';
		html += 					'btn'+(!edit['i']?'-outline':'')+'-danger">A</button>';
		html += 				'<button s type="button" class="btn ';
		html += 					(date?'btn-outline-warning':'btn-outline-success')+' btn-lg">';
		html += 					(date?'Edit':'Save')
		html += 				'</button>';
		html += 			'</div>';
		html += 		'</div>';
		html += 	'</div>';
		html += '</div>';
	let div = document.querySelector('#results div[total]');
	if(div){
		if(!input.html.busy() || force){
			list.draw.clear(true);
			document.querySelector('#results').setAttribute('input', '');
			div.innerHTML = html;
			document.dispatchEvent(new CustomEvent('input.html'));
			input.html.buttons.ini();
		};
	};
};
input.html.busy = function(){
	let ret = false;
	let inputs = document.querySelectorAll('#results[input] div[total] input');
	if(inputs){
		inputs.forEach(function(i){
			if(i === document.activeElement){
				ret = true;
			} else {
				let cf = (typeof i.parentElement.getAttribute('cf') == 'string');
				let ct = (typeof i.parentElement.getAttribute('ct') == 'string');
				let da = (typeof i.getAttribute('da') == 'string');
				if(i.value && !cf && !ct && !da){
					ret = true;
				};
			};
		});
	};
	return ret;
};
input.html.sort = function(obj){
	let o = Object.keys(obj).sort(function(a,b){
		let ar = obj[a]['mRating']||0;
		let br = obj[b]['mRating']||0;
		if (ar > br) {
			return -1;
		} else if (ar < br) {
			return 1;
		} else {
			let atr = obj[a]['tRating']||0;
			let btr = obj[b]['tRating']||0;
			if (atr >= btr) {
				return -1;
			} else if (atr < btr) {
				return 1;
			};
		};
	});
	return o;
};
input.html.inputGroup = function(ph,va,ty,obj){
	let html = '';
		html += '<input type="text" class="form-control" ';
		html += 	'placeholder="'+ph+'"'+(va?' value="'+va+'"':'')+'>';
		html += input.html.sel(ty,obj,va);
	return html;
};
input.html.sel = function(name,obj,first){
	let html = '';
		html += '<select '+name+' class="custom-select">';
		Object.keys(obj).some(function(i){
			if(i<50){
				html += '<option';
				html += 	((first && first==obj[i])||(!first && i<1)?' selected="1"':'');
				html += 	' value="'+obj[i]+'">';
				html += 		obj[i];
				html += '</option>';
			}else{
				return true;
			};
		});
		html += '</select>';
	return html;
};
input.html.currencies = function(){
	let html = '';
	if(data['currencies'] && data['currencies']['data']){
		let c = data['currencies']['data'];
		html += 		'<select class="custom-select">';
		html += 			'<option selected value="руб.">';
		html += 				'<span>руб.</span>';
		html += 			'</option>';
		html += 			'<option value="$">';
		html += 				'<div>$</div> ('+actives.getRound(c['USD']['rate'])+' руб.)';
		html += 			'</option>';
		html += 			'<option value="евро">';
		html += 				'<span>евро</span> ('+actives.getRound(c['EUR']['rate'])+' руб.)';
		html += 			'</option>';
		Object.keys(c).sort().forEach(function(curr){
			html += 		'<option value="'+curr+'">';
			html += 			'<span>'+curr+'</span> - '+c[curr]['name']+' ('+actives.getRound(c[curr]['rate'])+' руб.)';
			html += 		'</option>';
		});
		html += 		'</select>';
	};
	return html;
};
input.html.date = function(date){
	let html = '';
		html += '<input type="text" class="form-control" ';
		html += 	'placeholder="Date" ';
		html += 	'date="'+(date?date:'')+'"';
		html +=		(date?' value="'+(date+'').substr(0,19)+'"':'')+'>';
		html += '<input da type="date" class="form-control" min="2014-08-01" value="'+ct2.date().substr(0,10)+'">';
		html += '<div class="input-group-append">';
		html += 	'<button sn class="btn btn-outline-secondary" type="button">Now</button>';
		html += '</div>';
	return html;
};

input.html.buttons = function(style,obj,name){
	let html = '';
	let found = false;
	let limit = 7;
	if(style=='secondary')	limit = 12;
	if(style=='danger')		limit = 10;
	Object.keys(obj).forEach(function(i){
		if(name==obj[i]){
			found = true;
		}else{
			found = false;
		};
		if(i<limit || found){
			html += '<button type="button" ';
			html += 	'class="btn btn-'+(name!=obj[i]?'outline-':'')+style+'">'+obj[i];
			html += '</button>';
		};
	});
	return html;
};
input.html.buttons.ini = function(){
	try{
		let cfSelect = document.querySelector('#results[input] div[from] select[cf]');
			cfSelect.removeEventListener('change',input.html.buttons.ini.cfFunction);
			cfSelect.addEventListener('change',input.html.buttons.ini.cfFunction);
		let fSelect = document.querySelector('#results[input] div[from] select[f]');
			cfSelect.removeEventListener('change',input.html.buttons.ini.fFunction);
			fSelect.addEventListener('change',input.html.buttons.ini.fFunction);
		let fbButts = document.querySelectorAll('#results[input] div[from] div[fb] button');
			if(!input.html.buttons.ini.fbFunctionSave)	input.html.buttons.ini.fbFunctionSave = {};
			fbButts.forEach(function(i){
				let name = i.innerHTML;
				i.removeEventListener('click',input.html.buttons.ini.fbFunctionSave[name]);
				input.html.buttons.ini.fbFunctionSave[name] = input.html.buttons.ini.fbFunction(i);
				i.addEventListener('click',input.html.buttons.ini.fbFunctionSave[name]);
			});
		let fInput = document.querySelector('#results[input] div[from] div[f]>input');
			fInput.addEventListener('keydown',input.html.buttons.ini.fKeydown);
	}catch(e){};
	
	try{
		let inputs = document.querySelectorAll('#results[input] input');
		inputs.forEach(function(i){
			i.addEventListener('input',input.html.buttons.ini.check2save);
		});
		
		let amount = document.querySelector('#results[input] div[amount] input[am]');
			amount.addEventListener('change',input.html.buttons.ini.amountChange);
		let calcButton = document.querySelector('#results[input] div[amount] button[calc]');
			calcButton.addEventListener('click',input.html.buttons.ini.calcButton);
		let currSelect = document.querySelector('#results[input] div[amount] select');
			currSelect.addEventListener('change',input.html.buttons.ini.currSelect);
		let dateSelect = document.querySelector('#results[input] div[amount] input[da]');
			dateSelect.addEventListener('change',input.html.buttons.ini.dateSelect);
		let dateButton = document.querySelector('#results[input] div[amount] button[sn]');
			dateButton.addEventListener('click',input.html.buttons.ini.dateButton);
	}catch(e){};
	
	try{
		let tInput = document.querySelector('#results[input] div[to] div[t]>input');
			tInput.addEventListener('keydown',input.html.buttons.ini.tKeydown);
		let tbButts = document.querySelectorAll('#results[input] div[to] div[tb] button');
			if(!input.html.buttons.ini.tbFunctionSave)	input.html.buttons.ini.tbFunctionSave = {};
			tbButts.forEach(function(i){
				let name = i.innerHTML;
				i.removeEventListener('click',input.html.buttons.ini.tbFunctionSave[name]);
				input.html.buttons.ini.tbFunctionSave[name] = input.html.buttons.ini.tbFunction(i);
				i.addEventListener('click',input.html.buttons.ini.tbFunctionSave[name]);
			});
		let tSelect = document.querySelector('#results[input] div[to] select[t]');
			tSelect.removeEventListener('change',input.html.buttons.ini.tFunction);
			tSelect.addEventListener('change',input.html.buttons.ini.tFunction);
		let ctSelect = document.querySelector('#results[input] div[to] select[ct]');
			ctSelect.removeEventListener('change',input.html.buttons.ini.ctFunction);
			ctSelect.addEventListener('change',input.html.buttons.ini.ctFunction);
	}catch(e){};
	
	try{
		let coButts = document.querySelectorAll('#results[input] div[comments] div[comm]>button');
		if(!input.html.buttons.ini.cobFunctionSave)	input.html.buttons.ini.cobFunctionSave = {};
			coButts.forEach(function(i){
				let name = i.innerHTML;
				i.removeEventListener('click',input.html.buttons.ini.cobFunctionSave[name]);
				input.html.buttons.ini.cobFunctionSave[name] = input.html.buttons.ini.cobFunction(name);
				i.addEventListener('click',input.html.buttons.ini.cobFunctionSave[name]);
			});
		let coSelect = document.querySelector('#results[input] div[comments] select[comm]');
			coSelect.removeEventListener('change',input.html.buttons.ini.cosFunction);
			coSelect.addEventListener('change',input.html.buttons.ini.cosFunction);
		let coInput = document.querySelector('#results[input] div[comments] input');
			coInput.removeEventListener('keydown', input.html.buttons.ini.coiFunction);
			coInput.addEventListener('keydown', input.html.buttons.ini.coiFunction);
	}catch(e){};
	
	try{
		input.html.buttons.ini.check2save();
		let aButton = document.querySelector('#results[input] div[save] div>button[a]');
			aButton.addEventListener('click',input.html.buttons.ini.aButton);
		let saveButton = document.querySelector('#results[input] div[save] div>button[s]');
			saveButton.addEventListener('click',input.html.buttons.ini.saveButton);
	}catch(e){};
};

input.html.buttons.ini.f = function(name,source){
	try{
		let fi = document.querySelector('#results[input] div[from] div[f]>input').value;
		let fSelect = document.querySelector('#results[input] div[from] select[f]');
		let fs = fSelect[fSelect.selectedIndex].value;
		let fb = '';
		try{
			fb = document.querySelector('#results[input] div[from] div[fb] button.btn-danger').innerHTML;
		}catch(e){};
		if(!fi || fi==fs || fi==fb || fi==name){
			let cf = document.querySelector('#results[input] div[from] div[cf]>input').value;
			let getO = input.html.getO()['obj01'];
			let f = input.html.sort(getO[cf]);
			let currentF = document.querySelector('#results[input] div[from] div[f]>input').value;
			let divF = input.html.inputGroup('Actives',(name?name:(currentF?currentF:false)),'f',f);
			document.querySelector('#results[input] div[from] div[f]').innerHTML = divF;
			let buttonsF = '';
			document.querySelector('#results[input] div[from] div[fb]>div').innerHTML = buttonsF;
			if(!source){
				buttonsF = input.html.buttons('primary',f,name);
			}else{
				let getO2 = input.html.getO()['obj02'];
				let ct = document.querySelector('#results[input] div[to] div[ct]>input').value;
				let t = document.querySelector('#results[input] div[to] div[t]>input').value;
				if(!t){
					let tSelect = document.querySelector('#results[input] div[to] select[t]');
					t = tSelect[tSelect.selectedIndex].value;
				};
				let f2 = input.html.sort(getO2[(ct?ct:data['name'])][t][cf]);
				buttonsF = input.html.buttons('primary',f2,name);
			};
			if(buttonsF){
				document.querySelector('#results[input] div[from] div[fb]>div').innerHTML = buttonsF;
			};
		} else if (fi && fs) {
			document.querySelector('#results[input] div[from] div[f] input').value = fs
		}
	}catch(e){};
};
input.html.buttons.ini.ct = function(add2beginning) {
	try{
		let cf = document.querySelector('#results[input] div[from] div[cf]>input').value;
		let f = document.querySelector('#results[input] div[from] div[f]>input').value;
		if(!f){
			let fSelect = document.querySelector('#results[input] div[from] select[f]');
			f = fSelect[fSelect.selectedIndex].value;
		};
		let getO = input.html.getO()['obj01'];
		let ct = input.html.sort(getO[cf][f]);
		if (add2beginning) {
			add2beginning.forEach(e => {
				if (getO[e]) {
					delete getO[e];
				};
			});
		};
		let cf2 = input.html.sort(getO);
		let ctFirst = (ct[0]?ct[0]:data['name']);
		if (add2beginning) {
			ctFirst = add2beginning[0] || ctFirst;
			cf2 = add2beginning.concat(cf2);
		};
		let divCt = input.html.inputGroup('To-name',ctFirst,'ct',cf2);
		document.querySelector('#results[input] div[to] div[ct]').innerHTML = divCt;
	}catch(e){};
};
input.html.buttons.ini.t = function(name,source){
	try{
		let ti = document.querySelector('#results[input] div[to] div[t]>input').value;
		let tSelect = document.querySelector('#results[input] div[to] select[t]');
		let ts = tSelect[tSelect.selectedIndex].value;
		let tb = '';
		try{
			tb = document.querySelector('#results[input] div[to] div[tb] button.btn-danger').innerHTML;
		}catch(e){};
		if(!ti || ti==ts || ti==tb || ti==name){
			let cf = document.querySelector('#results[input] div[from] div[cf]>input').value;
			let f = document.querySelector('#results[input] div[from] div[f]>input').value;
			if(!f){
				let fSelect = document.querySelector('#results[input] div[from] select[f]');
				f = fSelect[fSelect.selectedIndex].value;
			};
			let ct = document.querySelector('#results[input] div[to] div[ct]>input').value;
			let divT = '';
			let buttonsT = '';
			let getO2 = input.html.getO()['obj02'];
			let t2 = input.html.sort(getO2[(ct?ct:data['name'])]);
			if(source){
				let getO = input.html.getO()['obj01'];
				let t = false;
				try{
					t = input.html.sort(getO[(cf?cf:data['name'])][f][(ct?ct:data['name'])]);
				}catch(e){};
				if(t){
					buttonsT = input.html.buttons('danger',t,name);
				}else{
					if (name) {
						document.querySelector('#results[input] div[to] div[t]>input').value = name
					}
				};
			}else{
				buttonsT = input.html.buttons('danger',t2,name);
			};
			let currentT = document.querySelector('#results[input] div[to] div[t]>input').value;
			divT = input.html.inputGroup('Spends',(name?name:(currentT?currentT:false)),'t',t2);
			if(buttonsT) document.querySelector('#results[input] div[to] div[tb]>div').innerHTML = buttonsT;
			if(divT)	document.querySelector('#results[input] div[to] div[t]').innerHTML = divT;
		} else if (ti && ts) {
			document.querySelector('#results[input] div[to] div[t] input').value = ts
		}
	}catch(e){};
};
input.html.buttons.ini.tb = function(){
	try{
		let cf = document.querySelector('#results[input] div[from] div[cf]>input').value;
		let f = document.querySelector('#results[input] div[from] div[f]>input').value;
		if(!f){
			let fSelect = document.querySelector('#results[input] div[from] select[f]');
			f = fSelect[fSelect.selectedIndex].value;
		};
		let ct = document.querySelector('#results[input] div[to] div[ct]>input').value;
		let getO = input.html.getO()['obj01'];
		let t = input.html.sort(getO[(cf?cf:data['name'])][f][(ct?ct:data['name'])]);
		let buttonsT = input.html.buttons('danger',t);
		document.querySelector('#results[input] div[to] div[tb]>div').innerHTML = buttonsT;
	}catch(e){};
};
input.html.buttons.ini.fb = function(){
	try{
		let ct = document.querySelector('#results[input] div[to] div[ct]>input').value;
		let t = document.querySelector('#results[input] div[to] div[t]>input').value;
		if(!t){
			let tSelect = document.querySelector('#results[input] div[to] select[t]');
			t = tSelect[tSelect.selectedIndex].value;
		};
		let cf = document.querySelector('#results[input] div[from] div[cf]>input').value;
		let getO2 = input.html.getO()['obj02'];
		let f = input.html.sort(getO2[(ct?ct:data['name'])][t][(cf?cf:data['name'])]);
		let buttonsF = input.html.buttons('primary',f);
		document.querySelector('#results[input] div[from] div[fb]>div').innerHTML = buttonsF;
	}catch(e){};
};
input.html.buttons.ini.co = function(){
	try{
		let coI = document.querySelector('#results[input] div[comments] input').value;
		if(!coI){
			let cf = document.querySelector('#results[input] div[from] div[cf]>input').value;
			let f = document.querySelector('#results[input] div[from] div[f]>input').value;
			if(!f){
				let fSelect = document.querySelector('#results[input] div[from] select[f]');
				f = fSelect[fSelect.selectedIndex].value;
			};
			let ct = document.querySelector('#results[input] div[to] div[ct]>input').value;
			let t = document.querySelector('#results[input] div[to] div[t]>input').value;
			if(!t){
				let tSelect = document.querySelector('#results[input] div[to] select[t]');
				t = tSelect[tSelect.selectedIndex].value;
			};
			let cu = document.querySelector('#results[input] div[amount] input[cu]').value;
			if(!cu){
				let cuSelect = document.querySelector('#results[input] div[amount] select');
				cu = cuSelect[cuSelect.selectedIndex].value;
			};
			let getO = input.html.getO()['obj01'];
			let comm = false;
			try{
				comm = input.html.sort(getO[(cf?cf:data['name'])][f][(ct?ct:data['name'])][t][cu]);
			}catch(e){};
			if(comm && comm.length){
				divCo = input.html.inputGroup('Comment',false,'comm',comm);
				buttonsCo = input.html.buttons('secondary',comm);
			}else{
				comm = input.html.sort(input.html.getO()['obj03']);
				if(comm && comm.length){
					divCo = input.html.inputGroup('Comment',false,'comm',comm);
					buttonsCo = input.html.buttons('secondary',comm);
				};
			};
			if(buttonsCo)	document.querySelector('#results[input] div[comments] div[comm]').innerHTML = buttonsCo;
			if(divCo)		document.querySelector('#results[input] div[comments] div.input-group').innerHTML = divCo;
		};
	}catch(e){};
};


input.html.buttons.ini.cfFunction = function(){
	try{
		let cfSelect = document.querySelector('#results[input] div[from] select[cf]');
		let cf = cfSelect[cfSelect.selectedIndex].value;
		document.querySelector('#results[input] div[from] div[cf]>input').value = cf;
		input.html.buttons.ini.f();
		input.html.buttons.ini.ct();
		input.html.buttons.ini.t(false,'cf');
		input.html.buttons.ini.tb();
		input.html.buttons.ini.co();
		input.html.buttons.ini();
	}catch(e){};
};
input.html.buttons.ini.fFunction = function(){
	try{
		let cfSelect = document.querySelector('#results[input] div[from] select[cf]');
		let cf = cfSelect[cfSelect.selectedIndex].value;
		let fSelect = document.querySelector('#results[input] div[from] select[f]');
		let f = fSelect[fSelect.selectedIndex].value;
		document.querySelector('#results[input] div[from] div[f]>input').value = f;
		input.html.buttons.ini.clearButtons('fb');
		input.html.buttons.ini.ct();
		input.html.buttons.ini.t(false,'f');
		input.html.buttons.ini.tb();
		input.html.buttons.ini.co();
		input.html.buttons.ini();
	}catch(e){};
};
input.html.buttons.ini.fbFunction = function(i){
	return (function(i){
		return function(){
			try{
				let name = i.innerHTML;
				let tb = document.querySelector('#results[input] div[to] div[tb] button.btn-danger');
				let ti = document.querySelector('#results[input] div[to] div[t]>input');
				if(!tb && !ti.value){
					input.html.buttons.ini.f(name);
					input.html.buttons.ini.ct();
					input.html.buttons.ini.t(false,'fb');
				}else{
					input.html.buttons.ini.f(name,'fb');
				};
				input.html.buttons.ini.co();
				input.html.buttons.ini();
				input.html.buttons.ini.clearButtons('fb',name);
			}catch(e){};
		};
	})(i);
};
input.html.buttons.ini.fKeydown = function(e){
	input.html.buttons.ini.clearButtons('fb');
};
input.html.buttons.ini.tKeydown = function(e){
	input.html.buttons.ini.clearButtons('tb');
};
input.html.buttons.ini.tbFunction = function(i){
	return (function(i){
		return function(){
			try{
				let name = i.innerHTML;
				let fb = document.querySelector('#results[input] div[from] div[fb] button.btn-primary');
				let fi = document.querySelector('#results[input] div[from] div[f]>input');
				if(!fb && !fi.value){
					input.html.buttons.ini.t(name);
					input.html.buttons.ini.f(false,'tb');
					
					let getO4 = input.html.getO()['obj04'];
					let cf = document.querySelector('#results[input] div[from] div[cf]>input').value;
					let addFirst = input.html.sort(getO4[name][cf]);
					input.html.buttons.ini.ct(addFirst);
				}else{
					input.html.buttons.ini.t(name);
				};
				
				input.html.buttons.ini.co();
				input.html.buttons.ini();
				input.html.buttons.ini.clearButtons('tb',name);
			}catch(e){};
		};
	})(i);
};
input.html.buttons.ini.tFunction = function(){
	try{
		let ctSelect = document.querySelector('#results[input] div[to] select[ct]');
		let ct = ctSelect[ctSelect.selectedIndex].value;
		let tSelect = document.querySelector('#results[input] div[to] select[t]');
		let t = tSelect[tSelect.selectedIndex].value;
		document.querySelector('#results[input] div[to] div[t]>input').value = t;
		input.html.buttons.ini.clearButtons('tb');
		input.html.buttons.ini.f(false,'t');
		input.html.buttons.ini.fb();
		input.html.buttons.ini.co();
		input.html.buttons.ini();
	}catch(e){};
};
input.html.buttons.ini.ctFunction = function(){
	try{
		let ctSelect = document.querySelector('#results[input] div[to] select[ct]');
		let ct = ctSelect[ctSelect.selectedIndex].value;
		document.querySelector('#results[input] div[to] div[ct]>input').value = ct;
		input.html.buttons.ini.t();
		input.html.buttons.ini.f(false,'ct');
		input.html.buttons.ini.fb();
		input.html.buttons.ini.co();
		input.html.buttons.ini();
	}catch(e){};
};

input.html.buttons.ini.check2save = function(e){
	if(input.html.buttons.ini.check2save.ST)	clearTimeout(input.html.buttons.ini.check2save.ST);
	input.html.buttons.ini.check2save.ST = setTimeout(function(){
		try{
			let a = document.querySelector('#results[input] div[amount] input[am]');
			let s = document.querySelector('#results[input] div[save] div>button[s]');
			if (input.html.buttons.ini.check2save.cases('allButAmount')) {
				if (e['type']!='input') {
					a.focus();
				};
			};
			let saveClass = s.getAttribute('class');
			if (
				input.html.buttons.ini.check2save.cases('allButtonsHaveSelected')
				||
				input.html.buttons.ini.check2save.cases('forgiveDebts')
			) {
				setTimeout(function(){input.drawButtons()},23);
				saveClass = saveClass.replace('btn-outline-success','btn-success');
				saveClass = saveClass.replace('btn-outline-warning','btn-warning');
			}else{
				saveClass = saveClass.replace('btn-success','btn-outline-success');
				saveClass = saveClass.replace('btn-warning','btn-outline-warning');
			};
			s.setAttribute('class',saveClass);
		}catch(e){};
	},107);
};
input.html.buttons.ini.check2save.cases = (caseName) => {
	let ret = false;
	let cf = document.querySelector('#results[input] div[from] div[cf]>input').value;
	let f = document.querySelector('#results[input] div[from] div[f]>input').value;
	let ct = document.querySelector('#results[input] div[to] div[ct]>input').value;
	let t = document.querySelector('#results[input] div[to] div[t]>input').value;
	let a = document.querySelector('#results[input] div[amount] input[am]');
	let da = document.querySelector('#results[input] div[amount] input[date]').value;
	let co = document.querySelector('#results[input] div[comments] input[type="text"]').value;
	let s = document.querySelector('#results[input] div[save] div>button[s]');
	if (caseName == 'allButAmount') {
		if (cf && f && ct && t && co && !a.value) {
			ret = true;
		};
	};
	if (caseName == 'allButtonsHaveSelected') {
		if (cf && f && ct && t && a.value && co) {
			ret = true;
		};
	};
	if (caseName == 'forgiveDebts') {
		if (cf && ct && cf!=ct && !f && !t && a.value && co) {
			ret = true;
		};
	}
	return ret;
};

input.html.buttons.ini.amountChange = function(){
	try{
		input.html.buttons.ini.check2save();
		if (input.html.buttons.ini.check2save.cases('allButtonsHaveSelected')) {
			document.querySelector('#results[input] div[save] div>button[s]').focus();
		};
	}catch(e){};
};
input.html.buttons.ini.calcButton = function(){
	let amount = document.querySelector('#results[input] div[amount] input[am]');
	if(amount){
		amount.setAttribute('type','text');
		amount.focus();
	};
};
input.html.buttons.ini.currSelect = function(){
	let currSelect = document.querySelector('#results[input] div[amount] select');
	let curr = currSelect[currSelect.selectedIndex].value;
	document.querySelector('#results[input] div[amount] input[cu]').value = curr;
};
input.html.buttons.ini.coFunction = function(comm){
	try{
		let getO3 = input.html.getO()['obj03'];
		let cf = input.html.sort(getO3[comm])[0];
		let f = input.html.sort(getO3[comm][cf])[0];
		let ct = input.html.sort(getO3[comm][cf][f])[0];
		let t = input.html.sort(getO3[comm][cf][f][ct])[0];
		input.html.buttons.ini.clearButtons('comm',comm);
		document.querySelector('#results[input] div[from] div[cf]>input').value = cf;
		let currentF = document.querySelector('#results[input] div[from] div[f]>input').value;
		input.html.buttons.ini.f(currentF&&currentF!=f?'':f);
		document.querySelector('#results[input] div[to] div[ct]>input').value = ct;
		let currentT = document.querySelector('#results[input] div[to] div[t]>input').value;
		input.html.buttons.ini.t(currentT&&currentT!=t?'':t);
		document.querySelector('#results[input] div[comments] input[type="text"]').value = comm;
		input.html.buttons.ini.cosFunction(comm);
		input.html.buttons.ini.co();
		input.html.buttons.ini();
	}catch(e){};
};
input.html.buttons.ini.cobFunction = function(comm){
	return (function(comm){
		return function(){
			input.html.buttons.ini.coFunction(comm);
		};
	})(comm);
};
input.html.buttons.ini.cosFunction = function(co){
	let coSelect = document.querySelector('#results[input] div[comments] select[comm]');
	if(!co || typeof co=='object'){
		let comm = coSelect[coSelect.selectedIndex].value;
		input.html.buttons.ini.coFunction(comm);
	}else{
		coSelect.value = co;
	};
};
input.html.buttons.ini.coiFunction = function(event) {
	if (input.html.buttons.ini.coiFunction.ST)	clearInterval(input.html.buttons.ini.coiFunction.ST);
	input.html.buttons.ini.coiFunction.ST = setTimeout(() => {
		let html = '';
		let string = this.value;
		let variants = new Search(string, 'commentsInput').labelsArray();
		if (variants) {
			variants.forEach(e => {
				html += '<a class="dropdown-item">' + e + '</a>';
			});
			let div = this.parentElement.querySelector('div.dropdown-menu');
			if (div && html) {
				div.innerHTML = html;
				div.querySelectorAll('a').forEach(e => {
					e.addEventListener('click', input.html.buttons.ini.coaFunction);
				});
				div.classList.add('show');
			};
		} else {
			input.hideDropdowns();
		};
	}, 2000);
};
input.html.buttons.ini.coaFunction = function() {
	let dropupDiv = this.parentElement.parentElement;
	dropupDiv.querySelector('input').value = this.innerText;
	input.hideDropdowns();
};
input.html.buttons.ini.dateSelect = function(){
	let da = document.querySelector('#results[input] div[amount] input[da]');
	let date = document.querySelector('#results[input] div[amount] input[date]');
	if(date && da.value){
		date.value = da.value+' 00:00:00';
		input.html.buttons.ini.check2save();
	};
};
input.html.buttons.ini.dateButton = function(){
	let date = document.querySelector('#results[input] div[amount] input[date]');
	if(date){
		date.value = ct2.date();
	};
};

input.html.buttons.ini.clearButtons = function(type,name){
	let color = 'primary';
	if(type=='tb')		color = 'danger';
	if(type=='comm')	color = 'secondary';
	if(type=='s')		color = 'success';
	let bs = document.querySelectorAll('#results[input] div>div['+type+'] button');
	bs.forEach(function(j){
		let classes = j.getAttribute('class');
		if(name != j.innerText){
			j.setAttribute('class',(classes+'').replace('btn-'+color,'btn-outline-'+color));
		}else{
			j.setAttribute('class',(classes+'').replace('btn-outline-'+color,'btn-'+color));
		};
	});
};
input.html.buttons.ini.aButton = function(){
	try{
		let a = document.querySelector('#results[input] div[save] div>button[a]');
		let classes = a.getAttribute('class');
		let color = 'danger';
		if((new RegExp('-outline-'+color)).test(classes+'')){
			a.setAttribute('class',(classes+'').replace('btn-outline-'+color,'btn-'+color));
		}else{
			a.setAttribute('class',(classes+'').replace('btn-'+color,'btn-outline-'+color));
		};
		input.html.buttons.ini.check2save();
	}catch(e){};
};

input.html.buttons.ini.saveButton = function(){
	let s = document.querySelector('#results[input] div[save] div>button[s]');
	try{
		s.setAttribute('disabled','disabled');
		let strings = document.querySelectorAll('#strings table tr[id*=" "]');
		if(strings && strings.length && strings.length==Object.keys(input.drawButtons.o).length){
			data.isFail();
			let dMarker = document.querySelector('#results[input] div[amount] input[date]').getAttribute('date');
			if(dMarker){
				input.html.buttons.ini.saveButton.edit(dMarker);
			};
			save2server.add(input.drawButtons.o);
			input.drawButtons.o = {};
			input.html(false,'force');
		}else{
			s.removeAttribute('disabled');
			input.html.buttons.ini.clearButtons('s');
		};
	}catch(e){};
};
input.html.buttons.ini.saveButton.edit = function(dMarker){
	let o = data['base'][dMarker];
	Object.keys(input.drawButtons.o).forEach(function(d){
		let idbo = input.drawButtons.o[d];
		if(idbo['a']*1==0){
			input.drawButtons.o[(d+'').substr(0,19)+'.'+'1'] = input.html.buttons.ini.saveButton.edit.del(o);
		}else{
			let if1 = (idbo['a'] != o['a']);
			let if2 = (idbo['cf'] != (o['cf']||data['name']));
			let if3 = (idbo['ct'] != (o['ct']||data['name']));
			let if4 = (o['f'] && idbo['f'] != o['f']);
			let if5 = (o['t'] && idbo['t'] != o['t']);
			let if6 = (o['co'] && idbo['co'] != o['co']);
			let if7 = (idbo['i'] != o['i']);
			let if8 = (idbo['cu'] != o['c']);
			if(if1 || if2 || if3 || if4 || if5 || if6 || if7 || if8){
				input.drawButtons.o[(d+'').substr(0,19)+'.'+'0'] = input.html.buttons.ini.saveButton.edit.del(o);
			}else{
				idbo = {};
			};
		};
	});
};
input.html.buttons.ini.saveButton.edit.del = function(o){
	let idbo = {};
		idbo['delete'] = true;
		idbo['a'] = o['a'];
		idbo['cf'] = o['cf']||data['name'];
		idbo['ct'] = o['ct']||data['name'];
		if(o['f'])	idbo['f'] = o['f'];
		if(o['t'])	idbo['t'] = o['t'];
		if(o['co'])	idbo['co'] = o['co'];
		if(o['i']){
			idbo['i'] = o['i'];
		}else{
			delete idbo['i'];
		};
		if(o['c']){
			idbo['cu'] = o['c'];
		}else{
			delete idbo['cu'];
		};
	return idbo;
};

input.html.getO = function(){
	let ret = {};
	let obj01 = {};
	let obj02 = {};
	let obj03 = {};
	let obj04 = {};
	let cache = data.cache('input.html.getO');
	if(cache){
		ret = cache;
	}else{
		let now = ct2.date('now');
		let secondsInMonth = 1000 * 60 * 60 * 24 * 30;
		let monthAgo = ct2.date('', now - secondsInMonth);
		let yearAgo = ct2.date('', now - secondsInMonth * 12);
		let o = data['base'];
		if(o && data['name']){
			let oLength = Object.keys(o).length;
			Object.keys(o).sort().reverse().forEach(function(d,i){
				let cf = o[d]['cf'];
				if(!cf)	cf = data['name'];
				let ct = o[d]['ct'];
				if(!ct)	ct = data['name'];
				let cu = o[d]['c'];
				if(!cu)	cu = 'руб.';
				let co = o[d]['co'];
				let date = (d + '').substr(0, 19);
				
				let month = false;
				let rating = (oLength-i)*1;
				if (date > monthAgo) {
					month = true;
				};
				if (date > yearAgo) {
					if(!obj01[cf]){
						obj01[cf] = {tRating:rating,mRating:(month?rating:0)};
					}else{
						obj01[cf]['tRating'] += rating;
						obj01[cf]['mRating'] += (month?rating:0);
					};
					input.html.getO.enumerable(obj01[cf]);
					if(o[d]['f']){
						if(!obj01[cf][o[d]['f']]){
							obj01[cf][o[d]['f']] = {tRating:rating,mRating:(month?rating:0)};
						}else{
							obj01[cf][o[d]['f']]['tRating'] += rating;
							obj01[cf][o[d]['f']]['mRating'] += (month?rating:0);
						};
						input.html.getO.enumerable(obj01[cf][o[d]['f']]);
						if(!obj01[cf][o[d]['f']][ct]){
							obj01[cf][o[d]['f']][ct] = {tRating:rating,mRating:(month?rating:0)};
						}else{
							obj01[cf][o[d]['f']][ct]['tRating'] += rating;
							obj01[cf][o[d]['f']][ct]['mRating'] += (month?rating:0);
						};
						input.html.getO.enumerable(obj01[cf][o[d]['f']][ct]);
						if(o[d]['t']){
							if(!obj01[cf][o[d]['f']][ct][o[d]['t']]){
								obj01[cf][o[d]['f']][ct][o[d]['t']] = {tRating:rating,mRating:(month?rating:0)};
							}else{
								obj01[cf][o[d]['f']][ct][o[d]['t']]['tRating'] += rating;
								obj01[cf][o[d]['f']][ct][o[d]['t']]['mRating'] += (month?rating:0);
							};
							input.html.getO.enumerable(obj01[cf][o[d]['f']][ct][o[d]['t']]);
							if(!obj01[cf][o[d]['f']][ct][o[d]['t']][cu]){
								obj01[cf][o[d]['f']][ct][o[d]['t']][cu] = {tRating:rating,mRating:(month?rating:0)};
							}else{
								obj01[cf][o[d]['f']][ct][o[d]['t']][cu]['tRating'] += rating;
								obj01[cf][o[d]['f']][ct][o[d]['t']][cu]['mRating'] += (month?rating:0);
							};
							input.html.getO.enumerable(obj01[cf][o[d]['f']][ct][o[d]['t']][cu]);
							if(co){
								if(!obj01[cf][o[d]['f']][ct][o[d]['t']][cu][co]){
									obj01[cf][o[d]['f']][ct][o[d]['t']][cu][co] = {tRating:rating,mRating:(month?rating:0)};
								}else{
									obj01[cf][o[d]['f']][ct][o[d]['t']][cu][co]['tRating'] += rating;
									obj01[cf][o[d]['f']][ct][o[d]['t']][cu][co]['mRating'] += (month?rating:0);
								};
								input.html.getO.enumerable(obj01[cf][o[d]['f']][ct][o[d]['t']][cu][co]);
							};
						};
					};
				};
				if (date > yearAgo) {
					if(!obj02[ct]){
						obj02[ct] = {tRating:rating,mRating:(month?rating:0)};
					}else{
						obj02[ct]['tRating'] += rating;
						obj02[ct]['mRating'] += (month?rating:0);
					};
					input.html.getO.enumerable(obj02[ct]);
					if(o[d]['t']){
						if(!obj02[ct][o[d]['t']]){
							obj02[ct][o[d]['t']] = {tRating:rating,mRating:(month?rating:0)};
						}else{
							obj02[ct][o[d]['t']]['tRating'] += rating;
							obj02[ct][o[d]['t']]['mRating'] += (month?rating:0);
						};
						input.html.getO.enumerable(obj02[ct][o[d]['t']]);
						if(!obj02[ct][o[d]['t']][cf]){
							obj02[ct][o[d]['t']][cf] = {tRating:rating,mRating:(month?rating:0)};
						}else{
							obj02[ct][o[d]['t']][cf]['tRating'] += rating;
							obj02[ct][o[d]['t']][cf]['mRating'] += (month?rating:0);
						};
						input.html.getO.enumerable(obj02[ct][o[d]['t']][cf]);
						if(o[d]['f']){
							if(!obj02[ct][o[d]['t']][cf][o[d]['f']]){
								obj02[ct][o[d]['t']][cf][o[d]['f']] = {tRating:rating,mRating:(month?rating:0)};
							}else{
								obj02[ct][o[d]['t']][cf][o[d]['f']]['tRating'] += rating;
								obj02[ct][o[d]['t']][cf][o[d]['f']]['mRating'] += (month?rating:0);
							};
							input.html.getO.enumerable(obj02[ct][o[d]['t']][cf][o[d]['f']]);
							if(!obj02[ct][o[d]['t']][cf][o[d]['f']][cu]){
								obj02[ct][o[d]['t']][cf][o[d]['f']][cu] = {tRating:rating,mRating:(month?rating:0)};
							}else{
								obj02[ct][o[d]['t']][cf][o[d]['f']][cu]['tRating'] += rating;
								obj02[ct][o[d]['t']][cf][o[d]['f']][cu]['mRating'] += (month?rating:0);
							};
							input.html.getO.enumerable(obj02[ct][o[d]['t']][cf][o[d]['f']][cu]);
							if(co){
								if(!obj02[ct][o[d]['t']][cf][o[d]['f']][cu][co]){
									obj02[ct][o[d]['t']][cf][o[d]['f']][cu][co] = {tRating:rating,mRating:(month?rating:0)};
								}else{
									obj02[ct][o[d]['t']][cf][o[d]['f']][cu][co]['tRating'] += rating;
									obj02[ct][o[d]['t']][cf][o[d]['f']][cu][co]['mRating'] += (month?rating:0);
								};
								input.html.getO.enumerable(obj02[ct][o[d]['t']][cf][o[d]['f']][cu][co]);
							};
						};
					};
				};
				
				if (date > yearAgo) {
					if(co){
						if(!obj03[co]){
							obj03[co] = {tRating:rating,mRating:(month?rating:0)};
						}else{
							obj03[co]['tRating'] += rating;
							obj03[co]['mRating'] += (month?rating:0);
						};
						input.html.getO.enumerable(obj03[co]);
						if(!obj03[co][cf]){
							obj03[co][cf] = {tRating:rating,mRating:(month?rating:0)};
						}else{
							obj03[co][cf]['tRating'] += rating;
							obj03[co][cf]['mRating'] += (month?rating:0);
						};
						input.html.getO.enumerable(obj03[co][cf]);
						if(o[d]['f']){
							if(!obj03[co][cf][o[d]['f']]){
								obj03[co][cf][o[d]['f']] = {tRating:rating,mRating:(month?rating:0)};
							}else{
								obj03[co][cf][o[d]['f']]['tRating'] += rating;
								obj03[co][cf][o[d]['f']]['mRating'] += (month?rating:0);
							};
							input.html.getO.enumerable(obj03[co][cf][o[d]['f']]);
							if(!obj03[co][cf][o[d]['f']][ct]){
								obj03[co][cf][o[d]['f']][ct] = {tRating:rating,mRating:(month?rating:0)};
							}else{
								obj03[co][cf][o[d]['f']][ct]['tRating'] += rating;
								obj03[co][cf][o[d]['f']][ct]['mRating'] += (month?rating:0);
							};
							input.html.getO.enumerable(obj03[co][cf][o[d]['f']][ct]);
							if(o[d]['t']){
								if(!obj03[co][cf][o[d]['f']][ct][o[d]['t']]){
									obj03[co][cf][o[d]['f']][ct][o[d]['t']] = {tRating:rating,mRating:(month?rating:0)};
								}else{
									obj03[co][cf][o[d]['f']][ct][o[d]['t']]['tRating'] += rating;
									obj03[co][cf][o[d]['f']][ct][o[d]['t']]['mRating'] += (month?rating:0);
								};
								input.html.getO.enumerable(obj03[co][cf][o[d]['f']][ct][o[d]['t']]);
							};
						};
					};
				};
				
				if (date > yearAgo) {
					if (!input.html.getO.groups)	input.html.getO.groups = {}
					if (o[d]['t']) {
						let t = o[d]['t'];
						if (!input.html.getO.last)	input.html.getO.last = {};
						if (date === input.html.getO.last.date) {
							if (cf === input.html.getO.last.cf) {
								if (t === input.html.getO.last.t) {
									if (ct != input.html.getO.last.ct) {
										if (!input.html.getO.groups[t])				input.html.getO.groups[t] = {};
										if (!input.html.getO.groups[t][cf])			input.html.getO.groups[t][cf] = {};
										if (!input.html.getO.groups[t][cf][date])	input.html.getO.groups[t][cf][date] = {};
										if (!input.html.getO.groups[t][cf][date][input.html.getO.last.ct]) {
											input.html.getO.groups[t][cf][date][input.html.getO.last.ct] = {tRating:rating,mRating:(month?rating:0)};
										} else {
											input.html.getO.groups[t][cf][date][input.html.getO.last.ct]['tRating'] += rating;
											input.html.getO.groups[t][cf][date][input.html.getO.last.ct]['mRating'] += (month?rating:0);
										};
										if (!input.html.getO.groups[t][cf][date][ct]) {
											input.html.getO.groups[t][cf][date][ct] = {tRating:rating,mRating:(month?rating:0)};
										} else {
											input.html.getO.groups[t][cf][date][ct]['tRating'] += rating;
											input.html.getO.groups[t][cf][date][ct]['mRating'] += (month?rating:0);
										};
									};
								};
							};
						} else {
							if (!input.html.getO.solo)			input.html.getO.solo = {};
							if (!input.html.getO.solo[t])		input.html.getO.solo[t] = {};
							if (!input.html.getO.solo[t][cf])	input.html.getO.solo[t][cf] = {};
							if (!input.html.getO.solo[t][cf][ct]) {
								input.html.getO.solo[t][cf][ct] = {tRating:rating,mRating:(month?rating:0)};
							} else {
								input.html.getO.solo[t][cf][ct]['tRating'] += rating;
								input.html.getO.solo[t][cf][ct]['mRating'] += (month?rating:0);
							};
						};
						input.html.getO.last = {
							date: date,
							cf: cf,
							ct: ct,
							t: t
						};
					};
				};
			});
			
			Object.keys(input.html.getO.groups).forEach(t => {
				obj04[t] = {};
				Object.keys(input.html.getO.groups[t]).forEach(cf => {
					obj04[t][cf] = {};
					let multiNames = {};
					Object.keys(input.html.getO.groups[t][cf]).forEach(date => {
						let multiName = '';
						let tRating = 0;
						let mRating = 0;
						Object.keys(input.html.getO.groups[t][cf][date]).sort().forEach(ct => {
							let obj = input.html.getO.groups[t][cf][date][ct];
							multiName += (multiName? ', ': '') + ct;
							tRating += obj['tRating'];
							mRating += obj['mRating'];
						});
						let roundedTrating = Math.round(tRating / Object.keys(input.html.getO.groups[t][cf][date]).length);
						let roundedMrating = Math.round(mRating / Object.keys(input.html.getO.groups[t][cf][date]).length);
						if (!obj04[t][cf][multiName]) {
							obj04[t][cf][multiName] = {
								tRating: tRating,
								mRating: mRating
							};
						} else {
							obj04[t][cf][multiName]['tRating'] += tRating;
							obj04[t][cf][multiName]['mRating'] += mRating;
						};
					});
					if (input.html.getO.solo[t]) {
						if (input.html.getO.solo[t][cf]) {
							Object.keys(input.html.getO.solo[t][cf]).forEach(ct => {
								obj04[t][cf][ct] = input.html.getO.solo[t][cf][ct];
							});
						};
					};
				});
			});
		};
		ret = {
			obj01: obj01,
			obj02: obj02,
			obj03: obj03,
			obj04: obj04
		};
		data.cache('input.html.getO',ret);
	};
	return ret;
};
input.html.getO.enumerable = function(o){
	if(o){
		Object.defineProperty(o,'tRating',{enumerable:false});
		Object.defineProperty(o,'mRating',{enumerable:false});
	};
};

input.drawButtons = function(){
	let tb = '<table class="table table-striped table-hover">';
	try{
		let cf = document.querySelector('#results[input] div[from] div[cf]>input').value;
		let f = document.querySelector('#results[input] div[from] div[f]>input').value;
		let a = document.querySelector('#results[input] div[amount] input[am]').value;
		let cu = document.querySelector('#results[input] div[amount] input[cu]').value;
		let ty = document.querySelector('#results[input] div[save] button[a].btn-danger');
		let d = document.querySelector('#results[input] div[amount] input[date]').value;
		let dMarker = document.querySelector('#results[input] div[amount] input[date]').getAttribute('date');
		let cts = document.querySelector('#results[input] div[to] div[ct]>input').value;
		let t = document.querySelector('#results[input] div[to] div[t]>input').value;
		let co = document.querySelector('#results[input] div[comments] input[type="text"]').value;
		if(a && co && ( (t && f) || (cts !== cf) )){
			input.drawButtons.o = {};
			if(!d)	d = ct2.date();
			d = input.drawButtons.date(d);
			if(!cts)	cts = data['name'];
			let arr = (cts+'').replace(/\,/g,'.').split('.');
			let distinct = {};
			arr.forEach(function(ct){
				let comT = inputString.findCT(ct);
				if (comT) {
					distinct[comT] = true;
				};
			});
			Object.keys(distinct).forEach(function(comT,i){
				let di = d+'.'+(i+1);
				input.drawButtons.o[di] = {
					cf:cf,
					f:f,
					ct:comT,
					t:t,
					a:input.drawButtons.amount(a,Object.keys(distinct).length),
					co:co
				};
				if(cu)	input.drawButtons.o[di]['c'] = cu;
				if(ty)	input.drawButtons.o[di]['i'] = 'A';
				tb += list.draw.tr(input.drawButtons.o,di);
			});
		};
	}catch(e){};
	tb += '</table>';
	list.draw.insert(tb);
};
input.drawButtons.date = function(d){
	let a = (d+'').replace(/[^0-9]/g,'');
	a = a+'0000000000000'.substring(0,14);
	return a.substr(0,4)+'-'+a.substr(4,2)+'-'+a.substr(6,2)+' '+a.substr(8,2)+':'+a.substr(10,2)+':'+a.substr(12,2);
};
input.drawButtons.amount = function(a,count){
	ret = false;
	a = (a+'').replace(/\,/g,'.').replace(/[^0-9\.\+\-\*\/\(\)]/g,'');
	amount = eval(a);
	return Math.round(((amount*1)/count)*100)/100;
};

input.hideDropdowns = () => {
	let div = document.querySelector('#results[input] div[total] div[comments] div.dropup>div');
	if (div) {
		div.classList.remove('show');
		div.querySelectorAll('a.dropdown-item').forEach(e => {
			e.removeEventListener('click', input.html.buttons.ini.coaFunction);
			e.remove();
		});
	};
};