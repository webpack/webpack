exports.x1 = require("./reexport-whole-exports?x1").m1;
var m2 = require("./reexport-whole-exports?x2");
exports.x2 = m2.m2;
this.x3 = require("./reexport-whole-exports?x3").m3;
var m4 = require("./reexport-whole-exports?x4");
this.x4 = m4.m4;
