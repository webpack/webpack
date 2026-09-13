"use strict";

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
		return ["main.mjs"];
	}
};
