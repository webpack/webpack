var foo = require("./foo?cjs").default;
exports.foo = foo;
var bar = require("./bar?cjs").bar;
exports.bar = bar;
exports.baz = "baz";

console.log.bind(console);
