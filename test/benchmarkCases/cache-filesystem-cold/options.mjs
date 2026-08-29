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
 * Drop the pack so each iteration builds from nothing and serializes a fresh
 * one — the store path `cache-filesystem` never reaches, since it restores.
 * @param {import("../../..").Configuration} config built configuration
 * @returns {Promise<void>}
 */
export async function beforeEach(config) {
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
