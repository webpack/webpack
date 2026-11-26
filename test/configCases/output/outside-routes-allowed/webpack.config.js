"use strict";

const outsideRoutes = require("../../../helpers/outsideRoutes");

/** @import { Configuration } from "../../../../" */

/** @type {(env: unknown, options: { testPath: string }) => Configuration} */
module.exports = (env, { testPath }) => outsideRoutes(testPath, "allowed");
