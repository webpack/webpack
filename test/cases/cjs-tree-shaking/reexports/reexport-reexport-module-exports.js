var m2 = require("./reexport-whole-module-exports?x2");
module.exports = {
	x1: require("./reexport-whole-module-exports?x1").m1,
	x2: m2.m2
};
module.exports.x3 = require("./reexport-whole-module-exports?x3").m3;
var m4 = require("./reexport-whole-module-exports?x4");
module.exports.x4 = m4.m4;
