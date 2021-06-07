let login = {};

login.ini = function(){
	if(obj.socket){
		obj.socket.on('finance6',function(o){
			if(o && typeof o=='object'){
				
			};
		});
		
		let n = document.querySelector("#login #name");
		if(n)	n.focus();
		
		let a = document.querySelectorAll("#login input");
		if(a){
			a.forEach(function(i){
				i.addEventListener("keyup",function(event){
					if(event.key === "Enter"){
						login.check();
					};
				});
			});
		};
		let b = document.querySelector('#login button.btn[type="submit"]');
		if(b){
			b.addEventListener("click",function(event){
				login.check();
			});
		};
	};
};

login.check = function(){
	let n = document.querySelector("#login #name");
	let p = document.querySelector("#login #inputPassword");
	let b = document.querySelector('#login button.btn[type="submit"]');
	if(n && n.value && (n.value+'').length>2){
		if(p && p.value && (p.value+'').length>2){
			n.disabled = true;
			p.disabled = true;
			b.disabled = true;
			data['name'] = n.value;
			obj.emit({t:'login',n:n.value,p:p.value});
		}else{
			p.focus();
		};
	}else{
		n.focus();
	};
};