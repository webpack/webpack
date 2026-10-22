"use strict";

const InfrastructureLogPlugin = require("../infrastructure-logging-levels/InfrastructureLogPlugin");

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	stats: { all: false, colors: true },
	infrastructureLogging: { level: "error", debug: /Debugged/, colors: true },
	plugins: [
		new InfrastructureLogPlugin("Debugged"),
		new InfrastructureLogPlugin("Other")
	]
};
