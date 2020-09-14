var fs = require("fs");

var findFile = function (files, regex) {
	return files.find(function (file) {
		if (regex.test(file)) {
			return true;
		}
	});
};

var verifyFilenameLength = function (filename, expectedNameLength) {
	expect(filename).toMatch(new RegExp("^.{" + expectedNameLength + "}$"));
};

module.exports = {
	findBundle: function (i, options) {
		var files = fs.readdirSync(options.output.path);

		var bundleDetects = [
			options.amd.expectedChunkFilenameLength && {
				regex: new RegExp("^\\d+.bundle" + i, "i"),
				expectedNameLength: options.amd.expectedChunkFilenameLength
			},
			{
				regex: new RegExp("^bundle" + i, "i"),
				expectedNameLength: options.amd.expectedFilenameLength
			}
		].filter(Boolean);

		var bundleDetect;
		var filename;

		for (bundleDetect of bundleDetects) {
			filename = findFile(files, bundleDetect.regex);
			if (!filename) {
				throw new Error(
					`No file found with correct name (regex: ${
						bundleDetect.regex.source
					}, files: ${files.join(", ")})`
				);
			}
			verifyFilenameLength(
				filename.replace(/^\d+\./, "X."),
				bundleDetect.expectedNameLength
			);
		}

		return "./" + filename;
	},
	afterExecute: () => {
		delete global.webpackChunk;
	}
};
