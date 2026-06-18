"use strict";

const { Worker } = require("worker_threads");

module.exports = {
	findBundle(i, options) {
		return [`./${options.name}/main.mjs`];
	},
	moduleScope(scope, options, target) {
		scope.URL = URL;
		// pure node target emits `new Worker(...)` expecting a global Worker;
		// the web target uses the fake Worker from the runner env.
		if (typeof target === "string" && target.startsWith("node")) {
			scope.Worker = Worker;
		}
	}
};
