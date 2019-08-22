module.exports = function supportDefaultAssignment() {
	try {
		// eslint-disable-next-line no-unused-vars
		var E = eval("class E { toString() { return 'default' } }");
		var f1 = eval("(function f1({a, b = E}) {return new b().toString();})");
		return f1({ a: "test" }) === "default";
	} catch (e) {
		return false;
	}
};
