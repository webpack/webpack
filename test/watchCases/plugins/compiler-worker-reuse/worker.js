"use strict";

module.exports.threadId = () => {
	try {
		return require("worker_threads").threadId;
	} catch (_err) {
		return 0;
	}
};
