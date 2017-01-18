var fs = require("fs");
require("should");

var verifyFilenameLength = function (files, regex, expectedNameLength) {
	for(var j = 0, file; j < files.length; j++) {
		file = files[j];
		if (regex.test(file)) {
			file.should.match(new RegExp("^.{" + expectedNameLength + "}$"));
			return "./" + file;
		}
	}
}

module.exports = {
	findBundle: function(i, options) {
		var files = fs.readdirSync(options.output.path);

		var expectedNameLength = options.amd.expectedFilenameLength;
		var bundleDetects = [{
			regex: new RegExp("^bundle" + i, "i"),
			expectedNameLength: options.amd.expectedFilenameLength
		}, {
			regex: new RegExp("^0.bundle" + i, "i"),
			expectedNameLenght: options.amd.expectedChunkFilenameLenght
		}
		]

		var bundleDetect;
		for (bundleDetect of bundleDetects) {
			return verifyFilenameLength(
				files,
				bundleDetect.regex,
				bundleDetect.expectedNameLength
			)
		}
	}
};
