var logs = {};

logs.draw = function(source){
	obj.activateButtons.clear();
	list.draw.clear();
	document.querySelector('#results').setAttribute('logs', '');
	obj.activateButtons.setColor('logs');
	list.count();
	logs.draw.buttons();
};

logs.draw.button = (name) => {
	let button = document.createElement('button');
		button.classList.add('btn');
		button.classList.add('btn-outline-light');
		button.classList.add('m-3');
		button.innerHTML = name;
		button.addEventListener('click', logs.buttonOnClick);
	return button;
};

logs.draw.buttons = () => {
	let resultsDiv = document.querySelector('#results');
	if (resultsDiv) {
		let leftDiv = resultsDiv.querySelector('div[left]');
		if (leftDiv) {
			leftDiv.classList.add('justify-content-center');
			leftDiv.appendChild(logs.draw.button('Show errors'));
		};
		let rightDiv = resultsDiv.querySelector('div[right]');
		if (rightDiv) {
			rightDiv.classList.add('justify-content-center');
			rightDiv.appendChild(logs.draw.button('JSON dump'));
			rightDiv.appendChild(logs.draw.button('MySQL dump'));
		};
	};
};

logs.saveFile = (fileName, text) => {
	let properties = {type: 'text/plain'};
	let blob = new Blob([text], {type: 'application/json'});
	let blobUrl = URL.createObjectURL(blob);
	let a = document.createElement('a');
		a.href = blobUrl;
		a.download = (fileName +'').replace(/ /g, '_');
		a.click();
};
logs.dropDisabled = (text) => {
	[...document.querySelectorAll('#results button[disabled]')]
		.filter(button => button.innerText == text)
		.forEach(button => button.removeAttribute('disabled'));
};

logs.buttonOnClick = function(){
	this.setAttribute('disabled', 'disabled');
	logs.buttonOnClick[this.innerText.split(' ').join('')](this);
};
logs.buttonOnClick.JSONdump = (t) => {
	let object = {};
		object['base'] = data['base'];
		object['currencies'] = data['currencies'];
		object['name'] = data['name'];
		object['shortMD5'] = data['shortMD5'];
	let text = JSON.stringify(object);
	let fileName = 'Finance6 dump ' + ct2.date() + '.json';
	logs.saveFile(fileName, text);
	t.removeAttribute('disabled');
};
logs.buttonOnClick.MySQLdump = () => {
	obj.emit({t:'getSQLdump'});
};
logs.buttonOnClick.MySQLdump.save = (sqlString) => {
	let fileName = 'Finance6 dump ' + ct2.date() + '.sql';
	logs.saveFile(fileName, sqlString);
	logs.dropDisabled('MySQL dump');
};
logs.buttonOnClick.Showerrors = () => {
	obj.emit({t:'showErrors'});
};
logs.buttonOnClick.Showerrors.show = (errorsObject) => {
	if (errorsObject && typeof errorsObject == 'object') {
		let div = document.createElement('div');
			div.classList.add('container');
			div.classList.add('mt-3');
			div.classList.add('list-group');
		Object.keys(errorsObject).sort().reverse().forEach((date) => {
			let ul = document.createElement('ul');
				ul.classList.add('m-4');
			let dateSpan = document.createElement('span');
				dateSpan.classList.add('ml-2');
				dateSpan.innerText = date;
			ul.appendChild(dateSpan);
			let pathLi = document.createElement('li');
				pathLi.classList.add('list-group-item');
				pathLi.classList.add('list-group-item-warning');
				pathLi.innerHTML = (errorsObject[date]['path'] + '')
					.replace(/(?<=.+finance6.+)\: ([0-9]+)/, ': <span class="font-weight-bold">$1</span>');
			ul.appendChild(pathLi);
			let errorLi = document.createElement('li');
				errorLi.classList.add('list-group-item');
				errorLi.classList.add('list-group-item-danger');
				let text = errorsObject[date]['error'];
				let html = (text + '')
					.replace(/</g, '_LEFT_ANGLE_BRACKET_')
					.replace(/>/g, '_RIGHT_ANGLE_BRACKET_')
					.replace(/_LEFT_ANGLE_BRACKET_/g, '<span>\<</span>')
					.replace(/_RIGHT_ANGLE_BRACKET_/g, '<span>\></span>')
					.replace(/\\t/g, '<span class="ml-4"></span>')
					.replace(/    /g, '<span class="ml-4"></span>')
					.replace(/   /g, '<span class="ml-3"></span>')
					.replace(/  /g, '<span class="ml-2"></span>')
					.replace(/(?<=\\n|^.+finance6.+)\:([0-9]+)/, ': <span class="font-weight-bold">$1</span>')
					.replace(/\\n/g, '<br/>');
				errorLi.innerHTML = html;
			ul.appendChild(errorLi);
			div.appendChild(ul);
		});
		document.querySelector('#strings').innerHTML = div.outerHTML;
		logs.dropDisabled('Show errors');
	};
};