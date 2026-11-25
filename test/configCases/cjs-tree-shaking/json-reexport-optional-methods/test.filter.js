"use strict";

// Optional calls require Node 14 when executing the emitted bundle.
module.exports = () => Number(process.versions.node.split(".", 1)[0]) >= 14;
