"use strict";

module.exports = {
	moduleScope(scope) {
		scope.AudioContext = class AudioContext {
			constructor() {
				this.audioWorklet = {
					addModule: () => Promise.resolve()
				};
			}
		};
	},
	findBundle() {
		return ["./main.js"];
	}
};
