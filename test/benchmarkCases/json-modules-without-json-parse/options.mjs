import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import createJson from "../../harness/benchmark/create-json.mjs";

const items = Array.from({ length: 25 }).fill("file");

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));

	await createJson(resolve(__dirname, "./generated"), items);
}
