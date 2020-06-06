var m2 = require("./module?pme2");
module.exports = {
	p1: require("./module?pme1").abc,
	p2: m2.abc
};
module.exports.p3 = require("./module?pme3").abc;
var m4 = require("./module?pme4");
module.exports.p4 = m4.abc;
