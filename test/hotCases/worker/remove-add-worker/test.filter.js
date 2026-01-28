"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

module.exports = (config) => supportsWorker() && config.target !== "async-node";
