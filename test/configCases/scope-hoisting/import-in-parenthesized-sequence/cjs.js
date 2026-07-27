// CommonJS so it stays out of the concatenation scope and its exports are
// referenced through the interop `(0, ns.export)` call wrapper.
exports.check = function check(value) {
	if (value === undefined) throw new Error("missing value");
	return value;
};
exports.combine = function combine(a, b) {
	return a + b;
};
