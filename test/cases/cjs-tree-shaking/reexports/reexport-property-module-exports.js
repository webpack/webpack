var m2 = require("./module?pme2" + __resourceQuery);
module.exports = {
	property1: require("./module?pme1" + __resourceQuery).abc,
	property2: m2.abc
};
module.exports.property3 = require("./module?pme3" + __resourceQuery).abc;
var m4 = require("./module?pme4" + __resourceQuery);
module.exports.property4 = m4.abc;
