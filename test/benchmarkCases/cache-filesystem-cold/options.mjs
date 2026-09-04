import fs from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import createTree from "../../harness/benchmark/create-tree.mjs";
import memoryScaledCount from "../../harness/benchmark/scale.mjs";

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const generated = resolve(__dirname, "./generated");

	await fs.rm(generated, { recursive: true, force: true });
	await createTree(generated, false, memoryScaledCount(75, 200));
}

/**
 * Drops the pack so each iteration measures the store path, not the restore one.
 * @param {import("../../..").Configuration} config built configuration
 * @returns {Promise<void>}
 */
export async function beforeEachIteration(config) {
	const { cache } = config;

	if (
		!cache ||
		typeof cache === "boolean" ||
		cache.type !== "filesystem" ||
		!cache.cacheDirectory
	) {
		throw new Error("Expected a filesystem cache with a resolved directory");
	}

	await fs.rm(cache.cacheDirectory, { recursive: true, force: true });
}
