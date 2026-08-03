"use strict";

module.exports = () => {
	try {
		require("worker_threads");
		return true;
	} catch (_err) {
		return "worker_threads is not available";
	}
};
