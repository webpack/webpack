var fs = require("fs");
require("should");

var findFile = function(files, regex) {
	return files.find(function(file) {
		if(regex.test(file)) {
			return true;
		}
	});
};

var verifyFilenameLength = function(filename, expectedNameLength) {
	filename.should.match(new RegExp("^.{" + expectedNameLength + "}$"));
};

module.exports = {
	findBundle: function(i, options) {
		var files = fs.readdirSync(options.output.path);

		var bundleDetects = [{
			regex: new RegExp("^0.bundle" + i, "i"),
			expectedNameLength: options.amd.expectedChunkFilenameLength
		}, {
			regex: new RegExp("^bundle" + i, "i"),
			expectedNameLength: options.amd.expectedFilenameLength
		}];

		var bundleDetect;
		var filename;

		for(bundleDetect of bundleDetects) {
			filename = findFile(files, bundleDetect.regex);
			verifyFilenameLength(
				filename,
				bundleDetect.expectedNameLength
			);
		}

		return "./" + filename;
	}
};
