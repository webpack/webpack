module.exports = function supportsIteratorDestructuring() {
	try {
		const f = eval("(function f([, x, ...y]) { return x; })");
		return f([1, 2]) === 2;
	} catch (_err) {
		return false;
	}
};
