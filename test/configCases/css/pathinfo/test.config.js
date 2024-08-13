const fs = require("fs");
const path = require("path");

module.exports = {
	moduleScope(scope) {
		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = "bundle0.css";
		scope.window.document.head.appendChild(link);
	},
	findBundle: function (i, options) {
		const source = fs.readFileSync(
			path.resolve(options.output.path, "bundle0.css"),
			"utf-8"
		);

		if (
			!source.includes(`/*!********************************!*\\
  !*** css ./style-imported.css ***!
  \\********************************/`) &&
			!source.includes(`/*!***********************!*\\
  !*** css ./style.css ***!
  \\***********************/`)
		) {
			throw new Error("The `pathinfo` option doesn't work.");
		}

		return "./bundle0.js";
	}
};
