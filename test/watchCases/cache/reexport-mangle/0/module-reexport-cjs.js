exports.foo = require("./foo?reexport-cjs").default;
exports.bar = require("./bar?reexport-cjs").bar;
exports.baz = "baz";

console.log.bind(console);
