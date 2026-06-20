"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

// TODO Bun's fake Worker (test/helpers/createFakeWorker.js) delivers messages on
// a different microtask turn than V8, racing HMR check() outside idle status.
module.exports = () => supportsWorker() && !process.versions.bun;
