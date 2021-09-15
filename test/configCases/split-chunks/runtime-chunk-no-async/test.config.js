const fs = require("fs");
module.exports = {
	findBundle: function(i, options) {
		var files = fs.readdirSync(options.output.path);
		return ["runtime.js", files.filter(f => /^main/.test(f))[0]];
	}
};
