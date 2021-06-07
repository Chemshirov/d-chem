var ct2 = {};
ct2.getCookie = function(cname){
	var name = cname + '=';
	var ca = document.cookie.split(';');
	for(var i=0;i<ca.length;i++){
		var c = ca[i];
		while(c.charAt(0)==' '){
			c = c.substring(1);
		}
		if(c.indexOf(name)==0){
			return c.substring(name.length,c.length);
		};
	};
	return '';
};
ct2.setCookie = function(name,val){
	document.cookie = (name+'')+'='+(val+'')+';expires=Fri, 31 Dec 9999 23:59:59 GMT;path=/';
};
ct2.deleteCookie = function(name){
	document.cookie = (name+'')+'=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
};
ct2.setLS = function(lsName,obj){
	try{
		localStorage.setItem((lsName+''),JSON.stringify(obj));
	}catch(err){
		localStorage.clear();
		ct2.setLS(lsName,obj);
	};
};
ct2.getLS = function(a){
	var b = '';
	var c = localStorage.getItem(a+'');
	if(c && (c+'')!='undefined'){
		try{
			b = JSON.parse((c+''));
		}catch(e){};
	};
	return b;
};
ct2.setTitle = function(body,title){
	if(body && title){
		title = ct2.escapeHtml(title,true);
		if(title){
			var head = body.siblings('head');
			if(head.find('title').length){
				head.find('title').text(title);
			}else{
				head.append('<title>'+title+'</title>');
			};
		};
	};
};
ct2.date = function(format,unixEpoxJS){
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
	n.wd = n.now.getDay();
	if(!n.wd)	n.wd = 7;
	var ret = n.y+'-'+n.mo+'-'+n.d+' '+n.h+':'+n.mi+':'+n.s;
	if(format=='chat'){
		if(n.d==n.z(new Date().getDate())){
			ret = n.h+':'+n.mi;
		}else{
			ret = n.y+'-'+n.mo+'-'+n.d+' '+n.h+':'+n.mi;
		};
	};
	if(typeof format=='number'){
		ret = (n.y+''+n.mo+''+n.d+''+n.h+''+n.mi+''+n.s+''+n.ml+''+(Math.random()+'').replace(/^0\./,'')).substring(0,format);
	};
	if(format=='now'){
		ret = (n.now.getTime())*1;
	};
	return ret;
};
ct2.vis = (function(){
	var stateKey, eventKey, keys = {
		hidden: "visibilitychange",
		webkitHidden: "webkitvisibilitychange",
		mozHidden: "mozvisibilitychange",
		msHidden: "msvisibilitychange"
	};
	for(stateKey in keys) {
		if(stateKey in document){
			eventKey = keys[stateKey];
			break;
		};
	};
	return function(){
		return !document[stateKey];
	};
})();
ct2.escapeHtml = function(unsafeStr,clear){
	var save = '';
	if(unsafeStr){
		save = (unsafeStr+'').replace(/&(?![^ &]+;)/g,'&amp;').replace(/</g,'&lt;')
			.replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
		if(clear){
			save = (save+'').replace(/&lt;|&gt;|&quot;|&#039;|&amp;/ig,'');
		};
	};
	return save;
};
ct2.capitalizeFirstLetter = function(str){
	str = (str+'');
	return str.substr(0,1).toUpperCase() + str.slice(1);
};