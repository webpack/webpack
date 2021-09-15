module.exports = function supportsLogicalAssignment() {
	try {
		var f = eval(
			"(function f() { var x = null; x ??= true; x &&= true; return x ||= false; })"
		);
		return f();
	} catch (e) {
		return false;
	}
};
