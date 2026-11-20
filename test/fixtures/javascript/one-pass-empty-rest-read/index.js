!(function (first, ...rest) {
	console.log(rest.length, Array.isArray(rest));
})();

!(function (...rest) {
	console.log(JSON.stringify(rest));
})();

var same = (function (...rest) {
	var read = function () {
		return rest;
	};
	return read() === read();
})();
console.log(same);

!(function (...rest) {
	var seen = [];
	for (var index = 0; index < 2; index++) seen.push(rest);
	console.log(seen[0] === seen[1]);
})();

!(function (...rest) {
	console.log(JSON.stringify({ rest: rest }), rest);
})();

!(function (...rest) {
	rest.push(1);
	console.log(rest.join());
})();
