module.exports = function supportDefaultAssignment() {
	try {
		// eslint-disable-next-line no-unused-vars
		const E = eval("(class E { toString() { return 'default' } })");
		const f1 = eval("(function f1({a, b = E}) {return new b().toString();})");
		return f1({ a: "test" }) === "default";
	} catch (_err) {
		return false;
	}
};
