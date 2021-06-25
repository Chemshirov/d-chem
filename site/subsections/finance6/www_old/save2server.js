var save2server = {};

save2server.add = function(o){
	return new Promise(function(r,e){
		if(o && typeof o=='object' && Object.keys(o).length){
			if(!data['save2server'])	data['save2server'] = {};
			let now = ct2.date();
			data['save2server'][now] = o;
			data.save();
			save2server.send();
		};
	}).catch(function(e){
	});
};

save2server.send = function(delay){
	if(!delay)		delay = 5;
	if(delay > 60)	delay = 60;
	let o = data['save2server'];
	if(o && typeof o=='object' && Object.keys(o).length){
		let md5 = MD5(JSON.stringify(o));
		obj.emit({t: 'save2server', o: data['save2server'], md5: md5});
		if(save2server.send.ST)	clearTimeout(save2server.send.ST);
		save2server.send.ST = setTimeout(function(){
			save2server.send(delay*1.2);
		},delay*1000);
	};
};

save2server.done = function(done){
	if(data['save2server'] && data['save2server'][done]){
		delete data['save2server'][done];
		data.save();
		data.ok();
	};
};

save2server.test = () => {
	// finance5's md5s prevent to work fully offline with data
	let date = Object.keys(data.base).sort().reverse()[0];
	Object.keys(data.base).sort().reverse().some((d, i) => {
		if (i < 5) {
			
		} else {
			return true;
		};
	});
};