module.exports = function supportsSpread() {
	try {
		var x = { a: true };
		var y;
		eval("y = { ...x }");
		return y !== x && y.a;
	} catch (_err) {
		return false;
	}
};
