var obj = {};
obj.date = function(format,unixEpoxJS){
	var n = {};
	n.now = new Date();
	if(unixEpoxJS)	n.now = new Date(unixEpoxJS);
	n.z = function(z){return(z<10?'0'+z:z)};
	n.y = n.now.getFullYear();
	n.mo = n.z(n.now.getMonth()+1);
	n.d = n.z(n.now.getDate());
	n.h = n.z(n.now.getHours());
	n.mi = n.z(n.now.getMinutes());
	n.s = n.z(n.now.getSeconds());
	n.ml = n.z(n.now.getMilliseconds());
	var ret = n.y+'-'+n.mo+'-'+n.d+' '+n.h+':'+n.mi+':'+n.s;
	if(format=='day')			ret = (n.d)*1;
	if(format=='hhmm')			ret = n.h+''+n.mi;
	if(format=='timeHM')		ret = n.h+':'+n.mi;
	if(format=='withMilli')		ret = n.y+'-'+n.mo+'-'+n.d+' '+n.h+':'+n.mi+':'+n.s+'.'+n.ml;
	if(format=='sqlWOseconds')	ret =  n.y+'-'+n.mo+'-'+n.d+' '+n.h+':'+n.mi;
	if(format=='name')			ret =  n.y+''+n.mo+''+n.d+'_'+n.h+''+n.mi+''+n.s;
	if(typeof format=='number'){
		ret = (n.y+''+n.mo+''+n.d+''+n.h+''+n.mi+''+n.s+''+n.ml+''+(Math.random()+'').replace(/^0\./,'')).substring(0,format);
	};
	if(format=='timer'){
		ret = 0;
		if(obj.date.timer){
			ret = 'takes: '+(n.now.getTime() - obj.date.timer)+' ms';
		}else{
			ret = 'timer starts @ '+obj.date();
		};
		obj.date.timer = n.now.getTime();
	};
	if(format=='now'){
		ret = (n.now.getTime())*1;
	};
	return ret;
};
obj.error = function(type,error,callback){
	if(typeof error=='object'&&error.stack){
		error = error.stack;
	};
	console.log('Error '+obj.date()+' '+type+' '+JSON.stringify(error));
	if(typeof callback=='function')		callback();
};
obj.tel2str = function(tel){
	var tele = (tel+'').replace(/[^0-9]/g,'');
	if(tele && tele.length>5){
		var str = '+';
		str += 7;
		str += ' (';
		str += (tele+'').substring(1,4);
		str += ') ';
		str += (tele+'').substring(4,7);
		str += '-';
		str += (tele+'').substring(7,9);
		str += '-';
		str += (tele+'').substring(9,11);
		return str;
	}else{
		return '';
	};
};
obj.getUID = function(socket){
	var uid = ''
	var a = (socket.handshake.headers.cookie + '').match(/chem=([a-z0-9]+)/)
	let worksOnlyWith3if = 'CORS for sockets and browsers has different headers and bunch of cookies'
	if (a) {
		uid = (a[0] + '').replace('chem=', '')
		if (socket.handshake.headers.uid) {
			uid = socket.handshake.headers.uid
		}
	} else {
		if (socket.handshake.headers.uid) {
			uid = socket.handshake.headers.uid
		}
	}
	return uid
};
obj.capitalizeFirstLetter = function(str){
	str = (str+'');
	return str.substr(0,1).toUpperCase() + str.slice(1);
};

module.exports = obj;