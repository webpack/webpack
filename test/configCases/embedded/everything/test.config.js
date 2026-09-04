"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(i) {
		return [["main.js"], ["types.js"], ["styles.js"]][i];
	},
	moduleScope(scope, options) {
		// What the bundle cannot reach for itself: documents webpack emitted
		// rather than handed over, and the bytes a base64 `data:` url carries.
		scope.readEmitted = (name) =>
			fs.readFileSync(path.join(options.output.path, name), "utf8");
		scope.decodeDataUrl = (url) =>
			Buffer.from(url.slice(url.indexOf(",") + 1), "base64").toString("utf8");
	}
};
