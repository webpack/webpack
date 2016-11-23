var fs = require("fs");
require("should");

module.exports = {
	findBundle: function(i, options) {
		var files = fs.readdirSync(options.output.path);
		var expectedNameLength = options.amd.expectedFilenameLength;
		var bundleDetect = new RegExp("^bundle" + i, "i");
		for(var j = 0, file; j < files.length; j++) {
			file = files[j];
			if (bundleDetect.test(file)) {
				file.should.match(new RegExp("^.{" + expectedNameLength + "}$"));
				return "./" + file;
			}
		}
	}
};
