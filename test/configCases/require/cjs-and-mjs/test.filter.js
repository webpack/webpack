"use strict";

const [major] = process.versions.node.split(".").map(Number);

module.exports = () => major >= 14;
