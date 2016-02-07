const isopod = require('../../');
const express = require('express');
const server = express();

server.use(express.static(__dirname));

function Potato () {
	this.weight = 1;
}

Potato.prototype.grow = function (factor) {
	this.weight += Math.floor(Math.random() * factor);
	return this;
};

server.post('/raw-potato', function (req, res, next) {
	const p = new Potato();
	console.log('server side potato instance', p);
	res.json(p);
});

server.post('/potato', function (req, res, next) {
	const p = new Potato();
	console.log('server side potato instance', p);
	res.json(isopod.serialize(p));
});

const port = 3000;
server.listen(port, function () {
	console.log('Happy server listening closely on port', port);
});