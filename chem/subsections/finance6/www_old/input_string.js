var inputString = {};

inputString.findCT = function(find) {
	let fi = (find+'').toLowerCase().replace(/[^a-zа-я0-9_\-]+/gi,'');
	let get = inputString.findCT.fi(fi);
	if (!get) get = inputString.findCT.fi(inputString.ru2eng(fi));
	if (!get) get = inputString.findCT.fi(inputString.eng2ru(fi));
	if (!get) get = inputString.findCT.fi(fi, 'ct');
	if (!get) get = inputString.findCT.fi(inputString.ru2eng(fi), 'ct');
	if (!get) get = inputString.findCT.fi(inputString.eng2ru(fi), 'ct');
	return get;
};
inputString.findCT.fi = function(fi, ctMode) {
	let ret = false;
	if(fi && (fi+'').length){
		try{
			let obj = input.html.getO()[ctMode ? 'obj01' : 'obj02'];
			let cs = input.html.sort(obj);
			cs.some(function(c){
				if((new RegExp(fi,'i')).test(c)){
					ret = c;
					return true;
				};
			});
		}catch(e){};
	};
	return ret;
};

inputString.ru2eng = function(str){
	let o = {};
		o['й']='q';o['ц']='w';o['у']='e';o['к']='r';o['е']='t';o['н']='y';o['г']='u';o['ш']='i';o['щ']='o';o['з']='p';
		o['ф']='a';o['ы']='s';o['в']='d';o['а']='f';o['п']='g';o['р']='h';o['о']='j';o['л']='k';o['д']='l';
		o['я']='z';o['ч']='x';o['с']='c';o['м']='v';o['и']='b';o['т']='n';o['ь']='m';o['_']='_';o['-']='-';
	let arr = (str+'').split('');
	let ret = '';
	arr.forEach(function(c){
		if(o[c])	ret += o[c];
	});
	return ret;
};
inputString.eng2ru = function(str){
	let o = {};
		o['q']='й';o['w']='ц';o['e']='у';o['r']='к';o['t']='е';o['y']='н';o['u']='г';o['i']='ш';o['o']='щ';o['p']='з';
		o['a']='ф';o['s']='ы';o['d']='в';o['f']='а';o['g']='п';o['h']='р';o['j']='о';o['k']='л';o['l']='д';
		o['z']='я';o['x']='ч';o['c']='с';o['v']='м';o['b']='и';o['n']='т';o['m']='ь';o['_']='_';o['-']='-';
	let arr = (str+'').split('');
	let ret = '';
	arr.forEach(function(c){
		if(o[c])	ret += o[c];
	});
	return ret;
};

inputString.findT = function(ct){
	ret = false;
	try{
		let obj02 = input.html.getO()['obj02'];
		console.log('inputString.findT', obj02);
	}catch(e){};
	return ret;
};

