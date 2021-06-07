let obj = {};
obj.html = {};

obj.read = function(){
	try{
		var s = obj.o.fs.readFileSync(obj.o.files+'server/oldCode/html').toString();
		s = s.replace(/[\t\n\r]/g,'').replace(/"/g,'\\"').replace(/'/g,'"');
		let o = JSON.parse(s);
		obj.html = o;
	}catch(e){
		obj.html = {};
	};
	// try{
		// var s = obj.o.fs.readFileSync(obj.o.files+'www/finance6/.html').toString();
		// let $ = obj.o.cheerio.load(s,{xml:{normalizeWhitespace:true,xmlMode:false,decodeEntities:false}});
		// obj.body = $('body').html();
	// }catch(e){
		// obj.o.error.send('html.js obj.read', e);
		// obj.body = false;
	// };
};
obj.show = function(t,b,name){
	let ret = obj.html[t]; 
	return ret;
};

var a = (function(obj){
	return function(o){
		obj.o = o;
		obj.read();
		return obj;
	};
})(obj);
module.exports = a;