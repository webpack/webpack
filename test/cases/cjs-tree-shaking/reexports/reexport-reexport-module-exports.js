var m2 = require("./reexport-whole-module-exports?x2" + __resourceQuery);
module.exports = {
	reexport1: require("./reexport-whole-module-exports?x1" + __resourceQuery)
		.module1,
	reexport2: m2.module2
};
module.exports.reexport3 = require("./reexport-whole-module-exports?x3" +
	__resourceQuery).module3;
var m4 = require("./reexport-whole-module-exports?x4" + __resourceQuery);
module.exports.reexport4 = m4.module4;
