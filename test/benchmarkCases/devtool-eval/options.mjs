import fs from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import createTree from "../../harness/benchmark/create-tree.mjs";
import memoryScaledCount from "../../harness/benchmark/scale.mjs";

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const generated = resolve(__dirname, "./generated");

	await fs.rm(generated, { recursive: true, force: true });
	// Large graph in memory mode only (see scale.mjs) — the watch-rebuild delta
	// scales with graph size, so a big tree lifts it out of the noisy sub-MB range.
	await createTree(generated, false, memoryScaledCount(50, 1200));
}
