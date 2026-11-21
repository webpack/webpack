"use strict";

const outsideRoutes = require("../../../helpers/outsideRoutes");

/** @type {(env: unknown, options: { testPath: string }) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) =>
	outsideRoutes(testPath, "futureDefaults");
