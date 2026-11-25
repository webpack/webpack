"use strict";

const nodeVersion = process.versions.node.split(".").map(Number);

module.exports = function supportsWorker() {
	// Verify that in the current node version new Worker() accepts URL as the first parameter:
	// https://nodejs.org/api/worker_threads.html#worker_threads_new_worker_filename_options
	return (
		(nodeVersion[0] === 12 && nodeVersion[1] >= 17) ||
		(nodeVersion[0] === 13 && nodeVersion[1] >= 12) ||
		nodeVersion[0] >= 14
	);
};
