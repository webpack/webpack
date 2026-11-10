import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import createServer from "../../harness/size/create-server.mjs";

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));

	await createServer(resolve(__dirname, "./generated"), 10, 10);
}
