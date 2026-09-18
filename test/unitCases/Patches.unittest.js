"use strict";

const { spawnSync } = require("child_process");
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

/**
 * Asks git whether a patch still applies to the working tree.
 * @param {string} name file name inside the patches directory
 * @param {boolean} reverse true to check the patch as already applied
 * @returns {{ status: number | null, stderr: string }} what git answered
 */
function checkApply(name, reverse) {
	const args = ["apply", "--check"];
	if (reverse) args.push("--reverse");
	args.push(path.join("test", "patches", name));
	const { status, stderr } = spawnSync("git", args, {
		cwd: repositoryRoot,
		encoding: "utf8"
	});
	return { status, stderr };
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
			// CI applies the patches before running this suite, so a patch that
			// is already in place only reverse-applies. Either direction proves
			// it still matches the installed dependency.
			const forward = checkApply(name, false);
			const reverse = checkApply(name, true);

			const applies = forward.status === 0 || reverse.status === 0;

			expect(applies ? "" : forward.stderr).toBe("");
		});
	});
});
