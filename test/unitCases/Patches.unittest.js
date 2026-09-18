"use strict";

const fs = require("fs");
const path = require("path");

const patchesDirectory = path.join(__dirname, "..", "patches");
const repositoryRoot = path.join(__dirname, "..", "..");

// A patch names a repository path as a string the patched dependency requires
// at runtime, so nothing resolves it until that dependency runs under CI.
const REPOSITORY_PATH_REGEXP = /"((?:test|lib|tooling)\/[^"]+)"/g;

/**
 * Repository-relative paths a patch's added lines name as string literals.
 * @param {string} patch contents of a patch file
 * @returns {string[]} the paths named, in the order they appear
 */
function collectRepositoryPaths(patch) {
	const paths = [];
	for (const line of patch.split("\n")) {
		if (!line.startsWith("+")) continue;
		for (const match of line.matchAll(REPOSITORY_PATH_REGEXP)) {
			paths.push(match[1]);
		}
	}
	return paths;
}

describe("patches", () => {
	const patchFiles = fs
		.readdirSync(patchesDirectory)
		.filter((name) => name.endsWith(".patch"));

	it("should have patches to check", () => {
		expect(patchFiles.length).toBeGreaterThan(0);
	});

	describe.each(patchFiles)("%s", (name) => {
		const patch = fs.readFileSync(path.join(patchesDirectory, name), "utf8");

		it("should only name repository paths that exist", () => {
			const named = collectRepositoryPaths(patch);
			const missing = named.filter(
				(relative) => !fs.existsSync(path.join(repositoryRoot, relative))
			);

			expect(missing).toEqual([]);
		});

		it("should apply to the installed dependency", () => {
			const applied = require("child_process").spawnSync(
				"git",
				["apply", "--check", path.join("test", "patches", name)],
				{ cwd: repositoryRoot, encoding: "utf8" }
			);

			expect(applied.stderr).toBe("");
			expect(applied.status).toBe(0);
		});
	});
});
