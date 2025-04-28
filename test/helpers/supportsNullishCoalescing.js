module.exports = function supportsNullishCoalescing() {
	try {
		const f = eval("(function f() { return null ?? true; })");
		return f();
	} catch (_err) {
		return false;
	}
};
