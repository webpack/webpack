import "./wrong-module";
function f() {}
f(module);
module.exports = "abc";
define([], function() {
	return 1234
});
exports.property = true;
