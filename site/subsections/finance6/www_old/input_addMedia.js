var addMedia = {};

document.addEventListener('input.html',function(e){
	let fileList = document.querySelector('#results[input] div[save] button[fileList]');
	if(fileList){
		fileList.addEventListener('click',function(){
			addMedia.dropdown();
		});
	};
	let file = document.querySelector('#results[input] div[save] input[type="file"]');
	if (file) {
		file.addEventListener('change',function(e){
			try{
				let f = file.files[0];
				let cl = (file.getAttribute('class') +'' ).replace(/ is-invalid/g,'');
				if (f['size'] < 1024 * 1024 * 1024) {
					let object = {
						file:file.files[0],
						name:f['name'],
						lastModified:f['lastModified'],
						type:f['type']
					};
					file.setAttribute('class',cl);
					let fileSender = new window['FileSender'](object);
						fileSender.onProgress((percent) => {
							addMedia.setTimer(percent);
						});
						fileSender.onError((err) => {
							file.setAttribute('class',cl+' is-invalid');
						});
						fileSender.onDone(() => {
							addMedia.fileHasWritten();
						});
						fileSender.onHide((fileName) => {
							addMedia.hide(fileName);
						});
				}else{
					file.setAttribute('class',cl+' is-invalid');
				};
			}catch(e){
				
			};
		});
	};
	let mediaButtons = document.querySelectorAll('#results[input] div[save] div[n] button');
	if(mediaButtons){
		mediaButtons.forEach(function(i){
			try{
				let cl = i.getAttribute('class');
				let n = i.parentElement.getAttribute('n');
				if((/btn\-link/).test(cl)){
					i.addEventListener('click',function(){
						let url = (window.location.origin+'')+'/media/'+n;
						window.open(url, '_blank').focus();
					});
				};
			}catch(e){};
		});
	};
});
document.addEventListener('fileSendingTimer', function (e) {
	addMedia.timer(e.detail);
});

addMedia.html = function(date){
	let html = '';
		html += '<div class="input-group mr-3 align-items-center">';
		html += 	'<div w>';
		html += 		'<div class="input-group">';
		html += 			'<div getList class="input-group-prepend">';
		html += 				'<button fileList class="btn btn-outline-dark dropdown-toggle" type="button">';
		html += 					'Get list';
		html += 				'</button>';
		html += 				'<div class="dropdown-menu"></div>';
		html += 			'</div>';
		html += 			'<div class="custom-file">';
		html += 				'<input type="file" class="custom-file-input" placeholder="Photo">';
		html += 				'<label class="custom-file-label">Add file</label>';
		html += 				'<div class="custom-file-label" timer></div>';
		html += 			'</div>';
		html += 		'</div>';
		html += 	'</div>';
		if(date && data['base'][date]){
			if(data['base'][date]['me']){
				Object.keys(data['base'][date]['me']).sort().forEach(function(n){
					html += 	'<div w n='+n+' class="btn-group">';
					let name = (n+'').replace(/^[^\/]+\/(.+)$/,'$1');
					html += 		'<button type="button" class="btn btn-link">'+name+'</button>';
					html += 		'<button type="button" class="btn btn-outline-dark">Unlink</button>';
					html += 	'</div>';
				});
			};
		};
		html += '</div>';
	return html;
};

addMedia.fileList = function(o){
	if(o && o['fileList']){
		let fileList = document.querySelector('#results[input] div[save] button[fileList]');
		if (fileList && fileList.getAttribute('fileList') == 'opened') {
			let html = '';
			o['fileList'].sort().forEach(function(name){
				html += addMedia.fileList.item(name);
			});
			let par = document.querySelector('#results[input] div[save] div[getList]').parentElement;
			let dropdown = document.querySelector('#dropdown');
			if(par && dropdown){
				dropdown.innerHTML = '<div>'+html+'</div>';
				let rect = par.getBoundingClientRect();
				dropdown.style.top = (rect['top']*1+rect['height']*1+2)+'px';
				dropdown.style.left = (rect['left']*1+2)+'px';
				dropdown.style.width = (rect['width']*1-4)+'px';
				addMedia.fileList.ini();
			};
		};
	};
};
addMedia.fileList.item = function(name){
	let html = '';
		html += '<div class="dropdown-item">';
		html += 	'<div>';
		html += 		'<button type="button" class="btn btn-link">'+name+'</button>';
		html += 	'</div>';
		html += 	'<div>';
		html += 		'<button class="btn btn-danger" type="button">Delete</button>';
		html += 		'<button class="btn btn-outline-info" type="button">Pin to</button>';
		html += 	'</div>';
		html += '</div>';
	return html;
};
addMedia.fileList.ini = function(){
	let a = document.querySelectorAll('#dropdown button');
	if(a){
		a.forEach(function(i){
			i.addEventListener('click',function(){
				if(data['name']){
					let cl = i.getAttribute('class');
					if((/btn-link/).test(cl)){
						let u = data['name']+'/'+i.innerText;
						let url = (window.location.href+'').replace(/(^.+\/)[^\/]+$/,'$1')+u;
						window.open(url, '_blank').focus();
					} else {
						try{
							let fileName = i.closest('.dropdown-item').querySelector('button.btn-link').innerText;
							if((/btn-danger/).test(cl)){
								if (window.socketIO && !window.socketIO.connected) {
									addMedia.deleteUnsentFiles(fileName);
								} else {
									obj.emit({t:'removeFile',name:fileName});
								};
								addMedia.dropdown('hide');
							}else if((/btn-outline-info/).test(cl)){
								let dropdown = document.querySelector('#dropdown');
								if(dropdown){
									dropdown.innerHTML = '';
									addMedia.fileList.pin(fileName);
								};
							};
						}catch(e){};
					};
				};
			});
		});
	};
};
addMedia.fileList.pin = function(fileName){
	try{
		let saveClass = document.querySelector('#results[input] div[save] button[s]').getAttribute('class');
		let date = document.querySelector('#results[input] div[amount] input[date]').getAttribute('date');
		if(!(/\-outline/).test(saveClass) && date){
			obj.emit({t:'pinFile',name:fileName,date:date});
			input.html(false,'force');
		};
	}catch(e){};
};

addMedia.dropdown = function (action, target) {
	let file = document.querySelector('#results[input] div[save] input[type="file"]');
	let fileList = document.querySelector('#results[input] div[save] button[fileList]');
	if(!target || (file != target && fileList != target)){
		if(action == 'hide') {
			addMedia.dropdown.hide();
		} else {
			if (fileList) {
				let menu = fileList.parentElement.querySelector('div.dropdown-menu');
				if(menu){
					let attr = fileList.getAttribute('fileList');
					let iff = (!attr || attr == 'closed' || action == 'open');
					if(iff){
						if (window.socketIO && !window.socketIO.connected) {
							addMedia.hide();
						} else {
							fileList.setAttribute('fileList','opened');
							obj.emit({t:'getFileList'});
						};
					}else{
						addMedia.dropdown.hide();
					};
				};
			};
		};
	};
};
addMedia.dropdown.hide = function () {
	let dropdown = document.querySelector('#dropdown');
	if(dropdown){
		dropdown.innerHTML = '';
		let fileList = document.querySelector('#results[input] div[save] button[fileList]');
		if (fileList) {
			fileList.setAttribute('fileList','closed');
		};
	};
};

addMedia.setTimer = (percent) => {
	let timerDiv = document.querySelector('#results[input] div[save] div[w] div[timer]');
	if (timerDiv) {
		if (percent) {
			timerDiv.parentElement.setAttribute('busy','');
			let fileInput = timerDiv.parentElement.querySelector('input[type="file"]');
			let timerDivIniStyle = window.getComputedStyle(fileInput);
			let timerDivIniWidth = (timerDivIniStyle.width + '').replace(/[^0-9\.]/g, '');
			
			let timerDivWidth = Math.floor( timerDivIniWidth * percent / 100 );
			let displayedPercent = percent;
			if (displayedPercent < 100 ) {
				let ending = (displayedPercent + '').replace(/[0-9]/g, '');
				if (!ending) {
					displayedPercent += '.0';
				};
			};
			timerDiv.style.cssText = 'width: ' + timerDivWidth + 'px';
			timerDiv.setAttribute('timer', displayedPercent);
		} else {
			timerDiv.setAttribute('timer', '');
			timerDiv.removeAttribute('style');
			timerDiv.parentElement.removeAttribute('busy');
		};
	};
};
addMedia.timer = (object) => {
	if (object && object['level']) {
		let timerDiv = document.querySelector('#results[input] div[save] div[w] div[timer]');
		if (timerDiv) {
			timerDiv.parentElement.setAttribute('busy','');
			let fileInput = timerDiv.parentElement.querySelector('input[type="file"]');
			let timerDivIniStyle = window.getComputedStyle(fileInput);
			let timerDivIniWidth = (timerDivIniStyle.width + '').replace(/[^0-9\.]/g, '');
			
			let levelWidth = timerDivIniWidth  / (object['levelMax'] + 1);
			let percentsWidth = levelWidth / 100 * object['percent']||0;
			let timerDivWidth = Math.floor( (levelWidth * object['level']) + percentsWidth );
			if (!addMedia.timer.lastTimerDivWidth || timerDivWidth > addMedia.timer.lastTimerDivWidth) {
				let displayedPercent = Math.floor(timerDivWidth / timerDivIniWidth * 100 * 10) / 10;
				if (displayedPercent < 100 ) {
					let ending = (displayedPercent + '').replace(/[0-9]/g, '');
					if (!ending) {
						displayedPercent += '.0';
					};
				};
				timerDiv.style.cssText = 'width: ' + timerDivWidth + 'px';
				timerDiv.setAttribute('timer', displayedPercent);
				addMedia.timer.lastTimerDivWidth = timerDivWidth;
			};
		};
	} else {
		addMedia.timer.lastTimerDivWidth = 0;
		let timerDiv = document.querySelector('#results[input] div[save] div[w] div[timer]');
		if (timerDiv) {
			timerDiv.setAttribute('timer', '');
			timerDiv.removeAttribute('style');
			timerDiv.parentElement.removeAttribute('busy');
		};
	};
};

addMedia.fileHasWritten = () => {
	let file = document.querySelector('#results[input] div[save] input[type="file"]');
	if (file) {
		addMedia.dropdown('open');
		file.blur();
	};
};

addMedia.hide = async () => {
	let file = document.querySelector('#results[input] div[save] input[type="file"]');
	if (file) {
		addMedia.setTimer();
		file.blur();
		let urls = await addMedia.unsentFiles.getList();
		if (urls) {
			let object = {};
				object['fileList'] = [];
			urls.forEach(url => {
				let fileName = url.replace(/^.+\/([^\/]+)\.base64strings$/, '$1');
				object['fileList'].push(fileName);
			});
			let fileList = document.querySelector('#results[input] div[save] button[fileList]');
			if (fileList) {
				fileList.setAttribute('fileList', 'opened');
				addMedia.fileList(object);
			};
		};
	};
};


addMedia.unsentFiles = async () => {
	let urls = await addMedia.unsentFiles.getList();
	if (urls && urls.length) {
		let url = urls[0];
		caches.open('base64strings').then(cache => {
			cache.match(url).then(response => {
				response.text().then(JSONstring => {
					try{
						let object = JSON.parse(JSONstring);
						let fileSender = new window['FileSender'](object);
							fileSender.onDone(() => {
								cache.delete(url).then(() => {
									addMedia.unsentFiles();
								});
							});
					} catch (e) {};
				});
			});
		});
	};
};
addMedia.unsentFiles.getList = () => {
	if (window.caches) {
		return caches.open('base64strings').then(cache => {
			return cache.keys().then(keys => {
				if (keys && keys.length) {
					let urls = {};
					keys.forEach(e => {
						urls[e['url']] = true;
					});
					return Object.keys(urls).sort();
				};
			});
		});
	}
};

addMedia.deleteUnsentFiles = async (fileName) => {
	let url = fileName + '.base64strings';
	caches.open('base64strings').then(cache => {
		cache.delete(url);
	});
};