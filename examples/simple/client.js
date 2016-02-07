document.getElementById('create-raw-potato').onclick = function () {
	fetch('/raw-potato', {
		method: 'POST'
	})
	.then(function (response) {
		return response.json();
	})
	.then(function (json) {
		console.log('raw potato coming from backend', json);
	});
};

document.getElementById('create-potato').onclick = function () {
	fetch('/potato', {
		method: 'POST'
	})
	.then(function (response) {
		return response.json();
	})
	.then(function (json) {
		const p = isopod.deserialize(json);
		console.log('cloned potato coming from backend', p);
	});
};