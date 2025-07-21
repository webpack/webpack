"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

module.exports = (config) => {
	if (config.target !== "web") {
		return false;
	}
	return supportsWorker();
};
