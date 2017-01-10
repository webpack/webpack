import "./wrong-module";
function f() {}
f(module);
module.exports = "abc";
define([], function() {
	return 1234
});
f(define);
exports.property = true;
