import fs from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import createTree from "../../harness/benchmark/create-tree.mjs";
import memoryScaledCount from "../../harness/benchmark/scale.mjs";

// HTML entry + many async JS chunks: htmlModules is non-empty while most chunks
// lack HTML_TYPE, so chunkHasHtml can skip ConcatSource.source() on them.
export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const generated = resolve(__dirname, "./generated");

	await fs.rm(generated, { recursive: true, force: true });
	await createTree(generated, false, memoryScaledCount(50, 150), 0);
}
