module.exports = function supportsOptionalChaining() {
	try {
		var f = eval("(function f() { return ({a: true}) ?.a })");
		return f();
	} catch (e) {
		return false;
	}
};
