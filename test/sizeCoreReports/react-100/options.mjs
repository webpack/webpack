import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import createApp from "../../harness/benchmark/create-app.mjs";

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));

	await createApp(resolve(__dirname, "./generated"), 10, 10);
}
