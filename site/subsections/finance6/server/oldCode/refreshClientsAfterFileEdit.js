let obj = {};

obj.startWatching = () => {
	obj.swFileWork('get');
	let path = obj.o.files + 'www_old/';
	obj.o.fs.watch(path, (eventType, fileName) => {
		if (fileName) {
			if (obj.startWatching.ST)	clearTimeout(obj.startWatching.ST);
			obj.startWatching.ST = setTimeout(() => {
				obj.swFileWork(fileName, 'finance6');
			}, 500);
		};
	});
};

obj.swFileWork = (type, label) => {
	if (!label)	label = 'finance6';
	// console.log('obj.swFileWork', type, label, 'serviceWorker has not updated!')
	
	// let swFileName = obj.o.files + 'www/' + 'serviceWorker.js';
	// let file = obj.o.fs.readFile(swFileName, (err, data) => {
		// if (!err) {
			// let string = data.toString();
			// let dateLabel = string.replace(/.+cacheName.=.'(chemshirov\_[0-9\_]+)'.*/s, '$1');
			// if (type === 'get' && dateLabel) {
				// obj.o.base['serviceWorkerDate'] = (dateLabel + '').replace(/^chemshirov\_/, '');
			// } else {
				// let newDate = obj.o.common.date().replace(' ', '_').replace(/[:\-]/g, '');
				// obj.o.base['serviceWorkerDate'] = newDate;
				// if (dateLabel && dateLabel.length == 26) {
					// let newString = string.replace(new RegExp(dateLabel), 'chemshirov_' + newDate);
					// if (string.length == newString.length) {
						// obj.o.fs.writeFile(swFileName, newString, err => {
							// if (!err) {
								// obj.o.io.sockets.emit(label, {t: 'refresh'});
							// };
						// });
					// };
				// };
			// };
		// };
	// });
};

var a = (function(obj){
	return function(o) {
		obj.o = o;
		obj.startWatching();
		return obj;
	};
})(obj);
module.exports = a;