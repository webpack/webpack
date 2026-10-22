"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const BIN = path.resolve(__dirname, "../../bin/webpack.js");

// Node's compile cache exists from Node.js 22.8; Bun and Deno expose the
// function without the cache behind it.
const { enableCompileCache } = /** @type {{ enableCompileCache?: () => void }} */ (
	require("module")
);
const hasCompileCache =
	typeof enableCompileCache === "function" &&
	!process.versions.bun &&
	!process.versions.deno;

/**
 * Runs `bin/webpack.js` on a configuration that reports, and then exits, what a
 * child process it starts reads as its compile cache directory.
 * @param {NodeJS.ProcessEnv} extra variables to set on top of a clean environment
 * @returns {{ variable: string | null, childDirectory: string | null }} what it reported
 */
const runBin = (extra) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wp-bin-cache-"));
	const config = path.join(dir, "webpack.config.js");
	fs.writeFileSync(
		config,
		`const { execFileSync } = require("child_process");
const childDirectory = execFileSync(process.execPath, [
	"-e",
	"process.stdout.write(JSON.stringify(require('module').getCompileCacheDir() || null))"
], { encoding: "utf8" });
process.stdout.write("REPORT" + JSON.stringify({
	variable: process.env.NODE_COMPILE_CACHE || null,
	childDirectory: JSON.parse(childDirectory)
}) + "\\n");
process.exit(0);
`
	);
	/** @type {NodeJS.ProcessEnv} */
	const env = {};
	for (const [name, value] of Object.entries(process.env)) {
		if (!name.startsWith("NODE_COMPILE_CACHE") && name !== "NODE_DISABLE_COMPILE_CACHE") {
			env[name] = value;
		}
	}
	try {
		const out = execFileSync(process.execPath, [BIN, "--config", config], {
			cwd: dir,
			encoding: "utf8",
			env: { ...env, ...extra }
		});
		return JSON.parse(out.slice(out.indexOf("REPORT") + 6).split("\n")[0]);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
};

(hasCompileCache ? describe : describe.skip)("bin/webpack.js compile cache", () => {
	it("hands the compile cache to the child processes it starts", () => {
		const { variable, childDirectory } = runBin({});
		expect(typeof variable).toBe("string");
		expect(typeof childDirectory).toBe("string");
		expect(/** @type {string} */ (childDirectory).startsWith(/** @type {string} */ (variable))).toBe(true);
	});

	it("keeps a directory the environment already names", () => {
		const own = fs.mkdtempSync(path.join(os.tmpdir(), "wp-own-cache-"));
		try {
			const { variable, childDirectory } = runBin({ NODE_COMPILE_CACHE: own });
			expect(variable).toBe(own);
			expect(/** @type {string} */ (childDirectory).startsWith(own)).toBe(true);
		} finally {
			fs.rmSync(own, { recursive: true, force: true });
		}
	});

	it("hands nothing on when a preload already enabled the cache", () => {
		const own = fs.mkdtempSync(path.join(os.tmpdir(), "wp-preload-"));
		const preload = path.join(own, "preload.js");
		fs.writeFileSync(preload, 'require("module").enableCompileCache();\n');
		try {
			const { variable, childDirectory } = runBin({
				NODE_OPTIONS: `--require ${JSON.stringify(preload)}`
			});
			// The preload's directory is already version-tagged, so handing it on
			// would make children tag it twice.
			expect(variable).toBeNull();
			expect(
				/** @type {string} */ (childDirectory).match(/v\d+\.\d+\.\d+-/g)
			).toHaveLength(1);
		} finally {
			fs.rmSync(own, { recursive: true, force: true });
		}
	});

	it("hands nothing on where the cache is disabled", () => {
		expect(runBin({ NODE_DISABLE_COMPILE_CACHE: "1" })).toEqual({
			variable: null,
			childDirectory: null
		});
	});
});
