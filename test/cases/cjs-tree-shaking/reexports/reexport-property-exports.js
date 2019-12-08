exports.p1 = require("./module?pe1").abc;
var m2 = require("./module?pe2");
exports.p2 = m2.abc;
this.p3 = require("./module?pe3").abc;
var m4 = require("./module?pe4");
this.p4 = m4.abc;
