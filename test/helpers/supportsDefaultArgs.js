module.exports = function supportsDefaultArgs() {
	try {
		var f = eval("(function f(a = 123) { return a; })");
		return f() === 123;
	} catch (e) {
		return false;
	}
};
