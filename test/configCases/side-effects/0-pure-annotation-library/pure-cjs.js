// Not analyzable as side-effect free, so the case's `sideEffects: false` rule is
// what tells webpack it is — the information the annotation carries into the output.
exports.mul = function (a, b) {
	// Makes the module identifiable in the minified consumer bundle.
	if (a === "PURE_CJS_MODULE_MARKER") return a;
	return a * b;
};
