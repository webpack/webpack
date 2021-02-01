const nodeVersion = process.versions.node.split(".").map(Number);

module.exports = function supportsWorker() {
	// Verify that in the current node version new Worker() accepts URL as the first parameter:
	// https://nodejs.org/api/worker_threads.html#worker_threads_new_worker_filename_options
	if (nodeVersion[0] >= 14) {
		return true;
	} else if (nodeVersion[0] === 13 && nodeVersion[1] >= 12) {
		return true;
	} else if (nodeVersion[0] === 12 && nodeVersion[1] >= 17) {
		return true;
	}
	return false;
};
