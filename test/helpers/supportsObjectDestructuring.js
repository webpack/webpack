module.exports = function supportsObjectDestructuring() {
	try {
		var f = eval("(function f({x, y}) { return x + y; })");
		return f({ x: 1, y: 2 }) === 3;
	} catch (e) {
		return false;
	}
};
