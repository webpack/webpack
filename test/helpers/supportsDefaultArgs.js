module.exports = function supportsDefaultArgs() {
	try {
		const f = eval("(function f(a = 123) { return a; })");
		return f() === 123;
	} catch (_err) {
		return false;
	}
};
