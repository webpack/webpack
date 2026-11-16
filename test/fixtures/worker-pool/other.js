"use strict";

module.exports.info = () => {
	const { threadId } = require("worker_threads");

	return { threadId };
};
