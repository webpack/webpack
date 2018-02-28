var fs = require("fs");
var path = require("path");
var dirs = fs.readdirSync(__dirname);
dirs.forEach(function(dir) {
	var actual = path.join(__dirname, dir, "actual.txt");
	var expected = path.join(__dirname, dir, "expected.txt");
	try {
		if(fs.existsSync(actual)) {
			fs.unlinkSync(expected);
			fs.renameSync(actual, expected);
		}
	} catch(e) {
		console.log(e);
	}
});
