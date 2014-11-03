var fs = require("fs");

module.exports = {
	findBundle: function(i, options) {
		var files = fs.readdirSync(options.output.path);
		var hashParamMatches = options.output.filename.match(/:(\d+)/);
		var hashLength = hashParamMatches && hashParamMatches[1];
		var bundleDetect = new RegExp("^bundle" + i, "i");
		for (var i = 0, file; i < files.length; i++) {
			file = files[i];
			if (bundleDetect.test(file)) {
				return "./" + file;
			}
		}
	}
};
