import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import createWorker from "../../harness/size/create-worker.mjs";

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));

	await createWorker(resolve(__dirname, "./generated"), 40);
}
