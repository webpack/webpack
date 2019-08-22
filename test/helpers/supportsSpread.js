module.exports = function supportsSpread() {
	try {
		var x = { a: true },
			y; // eslint-disable-line no-unused-vars
		eval("y = { ...x }");
		return y !== x && y.a;
	} catch (e) {
		return false;
	}
};
