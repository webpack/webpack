"use strict";

// Deno's and Bun's persistent-cache snapshot timing is nondeterministic here, so
// the ProgressPlugin module/dependency counts read back from the filesystem cache
// are intermittently stale (e.g. 3 instead of 4); skip on both runtimes.
module.exports = () => !process.versions.deno && !process.versions.bun;
