"use strict";

let outputDirectory;

module.exports = {
	moduleScope(scope) {
		const FakeWorker = require("../../../helpers/createFakeWorker")({
			outputDirectory
		});

		scope.AudioContext = class AudioContext {
			constructor() {
				this.audioWorklet = {
					addModule: (url) => Promise.resolve(FakeWorker.bind(null, url))
				};
			}
		};
	},
	findBundle(i, options) {
		outputDirectory = options.output.path;
		return ["main.js"];
	}
};
