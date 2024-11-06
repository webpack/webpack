const fs = require("fs");

let cssBundle;

module.exports = {
	findBundle: function (_, options) {
		const jsBundleRegex = new RegExp(/^bundle\..+\.js$/, "i");
		const cssBundleRegex = new RegExp(/^bundle\..+\.css$/, "i");
		const asyncRegex = new RegExp(/^async\..+\.js$/, "i");
		const files = fs.readdirSync(options.output.path);
		const jsBundle = files.find(file => jsBundleRegex.test(file));

		if (!jsBundle) {
			throw new Error(
				`No file found with correct name (regex: ${
					jsBundleRegex.source
				}, files: ${files.join(", ")})`
			);
		}

		const async = files.find(file => asyncRegex.test(file));

		if (!async) {
			throw new Error(
				`No file found with correct name (regex: ${
					asyncRegex.source
				}, files: ${files.join(", ")})`
			);
		}

		cssBundle = files.find(file => cssBundleRegex.test(file));

		if (!cssBundle) {
			throw new Error(
				`No file found with correct name (regex: ${
					cssBundleRegex.source
				}, files: ${files.join(", ")})`
			);
		}

		return [jsBundle, async];
	},
	moduleScope(scope) {
		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = cssBundle;
		scope.window.document.head.appendChild(link);
	}
};
