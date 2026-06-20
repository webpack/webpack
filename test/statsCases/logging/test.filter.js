"use strict";

// TODO Bun (JSC) prints different logging stats text than V8 (timings and
// console formatting differ), so the stats snapshot doesn't match.
module.exports = () => !process.versions.bun;
