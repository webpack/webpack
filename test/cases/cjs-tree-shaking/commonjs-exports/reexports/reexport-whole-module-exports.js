var module2 = require("./module?wme2" + __resourceQuery);
module.exports = {
	module1: require("./module?wme1" + __resourceQuery),
	module2
};
module.exports.module3 = require("./module?wme3" + __resourceQuery);
var m4 = require("./module?wme4" + __resourceQuery);
module.exports.module4 = m4;
