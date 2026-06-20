"use strict";

// TODO under Bun the bundle's import.meta.webpackHot.check() resolves on a later
// turn than V8, so the exported test's callback lands after its lazy-env slot and
// fails the run (attributed to "warmup"); skip on Bun.
module.exports = () => !process.versions.bun;
