"use strict";

// TODO Bun's node:inspector Session rejects concurrent profiler starts across
// jest workers ("Cannot change sampling interval while profiler is running"),
// so ProfilingPlugin cannot start here.
module.exports = () => !process.versions.bun;
