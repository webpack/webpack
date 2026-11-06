"use strict";

module.exports = () => {
	try {
		require("worker_threads");
		return true;
	} catch (_err) {
		return false;
	}
};
