"use strict";

// Wrapper invoked by lint-staged: ignores its file arguments and runs the
// project-wide `yarn lint:special` so a JSON schema or generator edit that
// forgot to regenerate fails locally instead of slipping into CI.

const { spawnSync } = require("child_process");

const result = spawnSync("yarn", ["lint:special"], {
	stdio: "inherit",
	shell: process.platform === "win32"
});

if (result.error) {
	console.error(result.error.message);
	process.exitCode = 1;
} else if (result.status !== 0) {
	process.exitCode = result.status === null ? 1 : result.status;
}
