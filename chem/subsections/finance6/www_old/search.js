var search = {};

document.addEventListener('socketEstablished', () => {
	search.init();
});

search.draw = function(source){
	list.count();
	new Search();
};

search.init = () => {
	let searchIcon = document.querySelector('#buttons div.btn-group div[si]');
	if (searchIcon) {
		searchIcon.addEventListener('click', search.clickOnIcon);
	};
	let searchInput = document.querySelector('#buttons div.btn-group input.search');
	if (searchInput) {
		searchInput.addEventListener('keydown', search.keydown);
		searchInput.addEventListener('change', search.start);
	};
};

search.clickOnIcon = (e) => {
	if (e)	e.stopPropagation();
	let divAboveSearch = document.querySelector('#buttons div.btn-group div[si]').parentElement;
	if (divAboveSearch) {
		let touched = divAboveSearch.getAttribute('touched');
		if (touched) {
			if (e)	search.undo(e.target);
		} else {
			divAboveSearch.setAttribute('touched', '1');
			let input = divAboveSearch.querySelector('input');
			if (input) {
				input.value = '';
				input.removeAttribute('disabled');
				input.focus();
			};
		};
	};
};

search.undo = (target) => {
	if (target && !(target.tagName.toLowerCase() == 'input' && target.classList.contains('search')) ) {
		let divAboveSearch = document.querySelector('#buttons div.btn-group div[si]').parentElement;
		if (divAboveSearch) {
			let touched = divAboveSearch.getAttribute('touched');
			if (touched) {
				divAboveSearch.removeAttribute('touched');
			};
		};
	};
	obj.searchIconChange();
};

search.keydown = (e) => {
	if (search.ST)	clearTimeout(search.ST);
	if (e.which == 13) {
		search.start();
	} else {
		search.ST = setTimeout(() => {
			new Search();
		}, 2000);
	};
};

search.start = () => {
	if (search.ST)	clearTimeout(search.ST);
	search.ST = setTimeout(() => {
		new Search();
	}, 50);
};

class Search {
	constructor(string, side) {
		this.STRINGS_LIMIT = 100;
		this.BUTTONS_LIMIT = 30;
		this.URL = '/finance6/search';
		this.TITLE_PREFIX = 'search: ';
		
		this.side = side;
		this._getString(string);
		
		if (this.searchString) {
			this._prepare();
			this._setTitle();
			this._find();
			this._getHTML();
			this._draw();
		};
	};
	
	_getString(string) {
		let input = document.querySelector('#buttons div.btn-group input.search');
		if (input) {
			let searchString = '';
			this.input = input;
			if (string) {
				if (!this.side) {
					searchString = this._fillTheInput(string);
				} else {
					searchString = string;
				};
			} else {
				if (!this.input.getAttribute('disabled') && this.input.value) {
					searchString = this.input.value;
				} else if (window.location.pathname === '/finance6/search') {
					if (window.location.search) {
						let locationString = (window.location.search + '').replace(/^\?(.+)$/, '$1');
						let stringFromLocation = decodeURI(locationString);
						searchString = this._fillTheInput(stringFromLocation);
					};
				};
			};
			if (searchString && searchString.length > 1) {
				let improvedSearchString = (searchString + '').replace(/[\<\>]/g, '');
				this.searchString = improvedSearchString;
				if (!this.side) {
					this.input.setAttribute('disabled', 'disabled');
				};
			};
		};
	};
	
	_fillTheInput(string) {
		search.clickOnIcon();
		this.input.value = string;
		return string;
	};
	
	_prepare() {
		if (!this.side) {
			let searchInput = this.input;
			if (this.input) {
				searchInput.setAttribute('disabled', 'disabled');
				this.searchString = searchInput.value;
			} else {
				if (window.location.search) {
					let string = (window.location.search + '').replace(/^\?(.+)$/, '$1');
						string = decodeURI(string);
					this.searchString = string;
				};
			};
			obj.activateButtons.clear();
			list.draw.clear();
		};
	};
	
	_setTitle() {
		if (!this.side) {
			let results = document.querySelector('#results');
				results.setAttribute('search', '');
			this.head = results.querySelector('div[total]');
			if (this.head) {
				let h2 = document.createElement('h2');
					h2.innerHTML = this.searchString + ':';
				this.head.appendChild(h2);
			};
		};
	};
	
	_find() {
		this.o = data['base'];
		if(this.o && data['name']){
			this.count = 0;
			this.html = '';
			this.labels = {};
			Object.keys(this.o).forEach((e) => {
				this._findInColumn(e, 'cf');
				this._findInColumn(e, 'f');
				this._findInColumn(e, 'ct');
				this._findInColumn(e, 't');
				this._findInColumn(e, 'c');
				this._findInColumn(e, 'co');
				this._findInColumn(e, 'me');
			});
		};
	};
	
	_findInColumn(e, columnName) {
		let content = this.o[e][columnName];
		if (content) {
			let columnText = content;
			if (typeof content == 'object') {
				columnText = JSON.stringify(content);
			};
			if (columnText.toLowerCase().indexOf(this.searchString.toLowerCase()) >= 0) {
				if (!this.foundDates)	this.foundDates = {};
				this.foundDates[e] = true;
				
				if (!this.labels[columnText])	this.labels[columnText] = 0;
				this.labels[columnText]++;
			};
		};
	};
	
	_getHTML() {
		if (!this.side) {
			if (this.foundDates && typeof this.foundDates == 'object') {
				Object.keys(this.foundDates).sort().reverse().some((e, i) => {
					if (i < this.STRINGS_LIMIT) {
						let tr = list.draw.tr(this.o, e);
						let desiredRegexp = new RegExp(this.searchString, 'ig');
						let desiredArray = tr.match(desiredRegexp);
						desiredArray.forEach((e) => {
							let selectRegexp = new RegExp('(?<!(\<[^\>]+))' + e, 'g');
							let glowHtml = '<span class="glow">' + e + '</span>';
							tr = tr.replace(selectRegexp, glowHtml);
						});
						this.html += tr;
					};
				});
			};
		};
	};
	
	_draw() {
		if (!this.side) {
			let title = this.TITLE_PREFIX + this.searchString;
			let url = this.URL + '?' + encodeURI(this.searchString);
			history.pushState(false, title, url);
			let titleTag = document.querySelector('head>title');
			if (titleTag) {
				titleTag.textContent = title;
			};
				
			if (this.html) {
				let tb = list.draw.tableTag(true);
					tb += this.html;
					tb += list.draw.tableTag();
				list.draw.insert(tb);
				
				this._drawStickers();
			};
			
			if (this.input) {
				this.input.removeAttribute('disabled');
			};
		};
	};
	
	_drawStickers() {
		if (this.labels && this.head) {
			Search.removeClickListener();
			let div = document.createElement('div');
			let sortedLabelsArray = this._sortedLabelsArray();
			sortedLabelsArray.some((e, i) => {
				if (this.labels[e] > 1) {
					if (e.toLowerCase() != this.searchString.toLowerCase()) {
						if (i < this.BUTTONS_LIMIT) {
							let button = document.createElement('button');
								button.setAttribute('type', 'button');
								button.classList.add('btn');
								button.classList.add('btn-warning');
								button.textContent = e;
								div.appendChild(button);
								Search.addClickListener(button);
						} else {
							return true;
						};
					};
				};
			});
			this.head.appendChild(div);
		};
	};
	
	_sortedLabelsArray() {
		if (this.labels) {
			return Object.keys(this.labels).sort((a, b) => {
				return this.labels[b] - this.labels[a];
			});
		};
	};
	
	labelsArray() {
		return this._sortedLabelsArray();
	};
	
	static addClickListener(element) {
		if (!Search.eventListeners)		Search.eventListeners = [];
		Search.eventListeners.push(element);
		element.addEventListener('click', Search.buttonOnClick);
	};
	
	static removeClickListener() {
		if (Search.eventListeners) {
			Search.eventListeners.forEach((element) => {
				element.removeEventListener('click', Search.buttonOnClick);
			});
			Search.eventListeners = [];
		};
	};
	
	static buttonOnClick() {
		let newSearchString = this.innerText;
		new Search(newSearchString);
	};
};