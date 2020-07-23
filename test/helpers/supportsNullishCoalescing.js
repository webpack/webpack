module.exports = function supportsObjectDestructuring() {
	try {
		var f = eval("(function f() { return null ?? true; })");
		return f();
	} catch (e) {
		return false;
	}
};
