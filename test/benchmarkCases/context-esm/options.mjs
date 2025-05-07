import createTree from "../_helpers/create-tree.mjs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const generated = resolve(__dirname, "./generated");

	await fs.rm(generated, { recursive: true, force: true });
	await createTree(generated, false, 25);
}
