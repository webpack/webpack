"use strict";

const majorVersion = Number.parseInt(process.versions.node.split(".")[0], 10);

module.exports = (config) => majorVersion >= 18;
