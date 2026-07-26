import fs from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import createTree from "../../harness/benchmark/create-tree.mjs";
import memoryScaledCount from "../../harness/benchmark/scale.mjs";

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const generated = resolve(__dirname, "./generated");

	await fs.rm(generated, { recursive: true, force: true });
	// Large graph in memory mode only (see scale.mjs); small for simulation/walltime.
	await createTree(generated, false, memoryScaledCount(25, 400));
}
