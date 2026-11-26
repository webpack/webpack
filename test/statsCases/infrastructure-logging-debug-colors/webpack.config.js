"use strict";

const InfrastructureLogPlugin = require("../infrastructure-logging-levels/InfrastructureLogPlugin");

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
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
