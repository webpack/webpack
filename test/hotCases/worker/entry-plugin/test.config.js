"use strict";

module.exports = {
	moduleScope(scope, options) {
		const FakeWorker = require("../../../helpers/createFakeWorker")({
			outputDirectory: options.output.path
		});

		scope.Worker = FakeWorker;
	}
};
