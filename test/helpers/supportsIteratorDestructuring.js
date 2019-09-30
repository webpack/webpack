module.exports = function supportsIteratorDestructuring() {
	try {
		var f = eval("(function f([, x, ...y]) { return x; })");
		return f([1, 2]) === 2;
	} catch (e) {
		return false;
	}
};
