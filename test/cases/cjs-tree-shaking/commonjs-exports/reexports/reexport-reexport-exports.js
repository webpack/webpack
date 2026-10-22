exports.reexport1 = require("./reexport-whole-exports?x1" +
	__resourceQuery).module1;
var m2 = require("./reexport-whole-exports?x2" + __resourceQuery);
exports.reexport2 = m2.module2;
this.reexport3 = require("./reexport-whole-exports?x3" +
	__resourceQuery).module3;
var m4 = require("./reexport-whole-exports?x4" + __resourceQuery);
this.reexport4 = m4.module4;
