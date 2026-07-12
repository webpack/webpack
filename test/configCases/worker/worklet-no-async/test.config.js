"use strict";

const fs = require("fs");
const path = require("path");

let outputDirectory;

module.exports = {
	moduleScope(scope) {
		const { createWorklet } = require("../../../helpers/createFakeWorklet")({
			outputDirectory
		});

		scope.AudioContext = class AudioContext {
			constructor() {
				this.audioWorklet = createWorklet();
			}
		};
	},
	findBundle(i, options) {
		outputDirectory = options.output.path;
		// `runtimeChunk: "single"` splits main's runtime out; load it first
		const bundles = [];
		if (fs.existsSync(path.join(outputDirectory, "runtime.js"))) {
			bundles.push("runtime.js");
		}
		bundles.push("main.js");
		return bundles;
	}
};
