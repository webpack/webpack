"use strict";

module.exports = {
	/**
	 * @param {Record<string, unknown>} scope module scope
	 * @param {import("../../../../").Configuration} options webpack options
	 */
	moduleScope(scope, options) {
		scope.URL = URL;
		scope.expectedWorkerType = options.output.module ? "module" : undefined;
		scope.SharedWorker =
			scope.Worker =
			scope.CustomWorker =
				class {
					/**
					 * @param {URL} url worker URL
					 * @param {string | WorkerOptions=} options worker options
					 */
					constructor(url, options) {
						this.url = url;
						this.options = options;
					}
				};
	}
};
