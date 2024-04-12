module.exports = function supportsSpread() {
	try {
		var x = { a: true },
			y;
		eval("y = { ...x }");
		return y !== x && y.a;
	} catch (e) {
		return false;
	}
};
