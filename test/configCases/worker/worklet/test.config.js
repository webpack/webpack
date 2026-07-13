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
		scope.CSS = {
			paintWorklet: createWorklet(),
			layoutWorklet: createWorklet(),
			animationWorklet: createWorklet()
		};
	},
	findBundle(i, options) {
		outputDirectory = options.output.path;
		return ["main.js"];
	}
};
