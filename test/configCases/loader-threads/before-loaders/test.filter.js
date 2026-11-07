"use strict";

module.exports = () =>
	require("../../../../lib/worker/WorkerPool").isThreadingAvailable();
