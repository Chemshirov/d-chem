let obj = {};

try{
	document.addEventListener("DOMContentLoaded",function(e){
		obj.idf();
		document.dispatchEvent(new CustomEvent("triggers",{"detail":{'socket':'start'}}));
	});
	document.addEventListener("triggers",function(e){
		if(e['detail']){
			if(e['detail']['socket']){
				if(e['detail']['socket']=='start'){
					// obj.serviceWorker();
					obj.socketIni();
				};
			};
		};
	});
	document.addEventListener('click', function(e){
		addMedia.dropdown('hide', e.target);
		list.showSum();
		search.undo(e.target);
		input.hideDropdowns();
	});
}catch(e){};


obj.idf = function(){
	if (!obj.uid||(obj.uid+'').length!=32)	obj.uid = ct2.getCookie('chem');
	if (!obj.uid||(obj.uid+'').length!=32) {
		obj.uid = 'chem'+ct2.date(32-4);
	};
	if (obj.uid&&(obj.uid+'').length==32) {
		ct2.setCookie('chem',(obj.uid+''));
	};
};
obj.socketIni = function(){
	obj.socket = io();
	obj.socket.on('finance6',function(o){
		if(o && typeof o=='object'){
			// if (!(/chunk/i).test(o['t'] + '')) {
				// console.log('socket from server', o); 
			// };
			let url = (window.location.pathname+'').replace(/^\/finance6/,'').replace(/^\//,'');
			if(!url)	url = 'list';
			if(o['t']=='login'){
				let body = document.querySelector('body');
				if(body){
					let loginDiv = document.querySelector('login');
					if(loginDiv){
						loginDiv.remove();
					};
					document.body.insertAdjacentHTML('afterbegin',o['html']);
					login.ini();
				};
			};
			if (o['t']=='loginOk') {
				let loginDiv = document.querySelector('#login');
				if(loginDiv){
					loginDiv.remove();
				};
				data['name'] = o['name'];
				data.go('loginOk');
				data.compare.currencies();
			};
			if (o['t']=='logout') {
				data.logout();
			};
			if (o['t'] === 'refresh') {
				location.reload(true)
			};
			if(o['t']=='url'){
				if(url=='login' || o['force']){
					document.title = o['title'];
					history.pushState(false,o['title'],'/finance6/'+o['url']);
				};
			};
			if(o['t']=='name'){
				data['name'] = o['n'];
				data.go('name');
			};
			if(o['t']=='currencies'){
				let c = o['data'];
					c['byDate'] = o['dateCurrencies'];
				data['currencies'] = c;
				data.save();
			};
			if(o['t']=='serverError'){
				data.isFail();
				if(o['name']){
					data['name'] = o['name'];
					data.go('serverError');
				};
			};
			if(o['t']=='serviceWorker'){
				obj.serviceWorker()
			}
			if (o['t'] == 'dataExchange')			data.compare(o);
			if (o['t'] == 'newDataHasAppeared')		data.compare(o);
			if (o['t'] == 'save2server')			save2server.done(o['done']);
			if (o['t'] == 'fileList')				addMedia.fileList(o);
			if (o['t'] == 'sqlString')				logs.buttonOnClick.MySQLdump.save(o['sqlString']);
			if (o['t'] == 'errorsObject')			logs.buttonOnClick.Showerrors.show(o['object']);
			
			if (o['t'] == 'load2release')			Test.showButton()
		};
	});
	obj.socket.on('connect',function(message){
		data.connection(true);
		if (addMedia) {
			addMedia.unsentFiles();
		};
	});
	obj.socket.on('disconnect',function(message){
		data.connection(false);
	});
	obj.emit({t:'start'});
	obj.activateButtons();
	data.start();
	obj.searchIconChange();
	save2server.send();
	window['socketIO'] = obj.socket;
	window['socketIOemit'] = obj.emit;
	document.dispatchEvent(new Event('socketEstablished'));
};
obj.emit = function(o){
	// if (!(/chunk/i).test(o['t'] + '')) {
		// console.log('emit', o);
	// };
	obj.emit.setSign(o, true);
	obj.socket.emit('finance6', o);
};
obj.emit.setSign = function(o,admin){
	let html = '';
		html += '<div id="emit">';
			html += '<div>';
				html += 'emit'+(admin?': '+o['t']:'');
			html += '</div>';
		html += '</div>';
	obj.removeSign('emit');
	let body = document.querySelector('body');
	if(body){
		body.insertAdjacentHTML('beforeend',html);
		if(obj.emit.setSign.ST)	clearTimeout(obj.emit.setSign.ST);
		obj.emit.setSign.ST = setTimeout(function(){
			obj.removeSign('emit');
		},1234);
	};
};
obj.removeSign = function(id){
	if(id){
		let ids = document.querySelectorAll('#'+id);
		if(ids){
			ids.forEach(function(i){
				i.remove();
			});
		};
	};
};

obj.getDraw = function(a,source){
	let url = false
	if(!a){
		url = (window.location.pathname+'').replace(/^\/finance6/,'').replace(/^\//,'') || 'list'
	}
	try{
		window[a || url].draw(source);
	}catch(e){};
};

obj.activateButtons = function(){
	let bs = document.querySelectorAll('#buttons button[a]');
	if(bs){
		bs.forEach(function(i){
			i.addEventListener('click',function(){
				obj.activateButtons.click(i);
			});
		});
	};
};
obj.activateButtons.click = function(i,notClick){
	let a = i.getAttribute('a');
	if(a){
		let title = ct2.capitalizeFirstLetter(a);
		let url = a;
		if(a=='list'){
			title = data['name'];
			url = '';
		};
		history.pushState(false,document.title,'/finance6/'+url);
		obj.activateButtons.setColor(a);
		if(!notClick){
			obj.emit({t:a,v:a+' button has clicked'});
			obj.getDraw(a,'button '+url);
		};
	};
};
obj.activateButtons.setColor = function(a){
	let butt = document.querySelector('#buttons button[a="'+a+'"]');
	if(butt){
		let classes = butt.getAttribute('class');
		if(classes){
			obj.activateButtons.clear();
			butt.setAttribute('class',(classes+'').replace('btn-outline-','btn-'));
		};
	};
};
obj.activateButtons.clear = function(){
	let bs = document.querySelectorAll('#buttons button[a]');
	if(bs){
		bs.forEach(function(i){
			let cl = i.getAttribute('class');
			if(cl){
				i.setAttribute('class',(cl+'').replace(/btn-([a-z]+)( |$)/,'btn-outline-$1'));
			};
		});
	};
};

obj.searchIconChange = function(){
	try{
		let ic = 0;
		let em = 0;
		let div = document.querySelector('#buttons div[si]>div');
		let gcs = getComputedStyle(div);
		ic = Math.round(div.clientWidth - (gcs.paddingLeft+'').replace('px','')*2);
		let div2 = document.querySelector('#buttons');
		let gcs2 = getComputedStyle(div2);
		em = Math.round((gcs2.paddingTop+'').replace('px','')*1);
		if (ic * 2 < em) {
			//div.innerHTML = '&#128269;';
		};
	}catch(e){};
};

obj.serviceWorker = () => {
	if ('serviceWorker' in navigator) {
		let path = '/serviceWorker.js'
		let register = navigator.serviceWorker.register(path)
		register.then(registration => {
			registration.update()
		}).catch(error => {
			window.onerror(error, 'obj.serviceWorker')
		})
		navigator.serviceWorker.addEventListener('message', event => {
			if (event.data && event.data == 'refresh') {
				location.reload(true)
			}
		})
	}
}

window.onerror = function (errTitle, url, line, column, error) {
	let sending = {};
		sending['t'] = 'error';
		sending['label'] = url + (line? ': ' + line : '');
		sending['err'] = errTitle;
		if (error && error.stack) {
			sending['err'] = new String(error.stack);
		};
	obj.emit(sending);
	window.showO(sending);
	return true;
};



//////////////////////////////




window.showO = function(o){
	if(o){
		if (!window.showO.string) {
			window.showO.string = '';
		};
		window.showO.string += JSON.stringify(o) + '<br>';
	};
	let html = '';
		html += '<div id="showO" onclick="this.remove()">';
			html += '<div>';
				html += window.showO.string;
			html += '</div>';
		html += '</div>';
	obj.removeSign('showO');
	let body = document.querySelector('body');
	if(body){
		body.insertAdjacentHTML('beforeend',html);
		if(obj.showO_ST)	clearTimeout(obj.showO_ST);
		obj.showO_ST = setTimeout(function(){
			obj.removeSign('showO');
		},1000*60*5);
	};
};