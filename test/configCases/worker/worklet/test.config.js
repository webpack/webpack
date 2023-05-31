let outputDirectory;

module.exports = {
	moduleScope(scope) {
		const FakeWorker = require("../../../helpers/createFakeWorker")({
			outputDirectory
		});

		// Pseudo code
		scope.AudioContext = class AudioContext {
			constructor() {
				this.audioWorklet = {
					addModule: url => Promise.resolve(FakeWorker.bind(null, url))
				};
			}
		};
		scope.CSS = {
			paintWorklet: {
				addModule: url => Promise.resolve(FakeWorker.bind(null, url))
			},
			layoutWorklet: {
				addModule: url => Promise.resolve(FakeWorker.bind(null, url))
			},
			animationWorklet: {
				addModule: url => Promise.resolve(FakeWorker.bind(null, url))
			}
		};
	},
	findBundle: function (i, options) {
		outputDirectory = options.output.path;
		return ["main.js"];
	}
};
