var fs = require("fs");
var path = require("path");

module.exports = function checkArrayExpectation(testDirectory, object, kind, upperCaseKind, done) {
	var array = object[kind + "s"].slice().sort();
	if(kind === "warning") array = array.filter(function(item) {
		return !/from UglifyJs/.test(item);
	});
	if(fs.existsSync(path.join(testDirectory, kind + "s.js"))) {
		var expected = require(path.join(testDirectory, kind + "s.js"));
		if(expected.length < array.length)
			return done(new Error("More " + kind + "s while compiling than expected:\n\n" + array.join("\n\n"))), true;
		else if(expected.length > array.length)
			return done(new Error("Less " + kind + "s while compiling than expected:\n\n" + array.join("\n\n"))), true;
		for(var i = 0; i < array.length; i++) {
			if(Array.isArray(expected[i])) {
				for(var j = 0; j < expected[i].length; j++) {
					if(!expected[i][j].test(array[i]))
						return done(new Error(upperCaseKind + " " + i + ": " + array[i] + " doesn't match " + expected[i][j].toString())), true;
				}
			} else if(!expected[i].test(array[i]))
				return done(new Error(upperCaseKind + " " + i + ": " + array[i] + " doesn't match " + expected[i].toString())), true;
		}
	} else if(array.length > 0) {
		return done(new Error(upperCaseKind + "s while compiling:\n\n" + array.join("\n\n"))), true;
	}
}
