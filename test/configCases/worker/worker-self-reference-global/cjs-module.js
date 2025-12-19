// CommonJS module with self-reference dependency
// Reading exports.value inside getValue creates a CommonJsSelfReferenceDependency
exports.value = 42;
exports.getValue = function() {
	// This line reads from exports, creating a self-reference
	return exports.value;
};
// Also test module.exports self-reference
module.exports.doubleValue = function() {
	return module.exports.value * 2;
};
