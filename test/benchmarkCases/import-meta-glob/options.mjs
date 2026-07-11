import fs from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DIRS = 15;
const FILES_PER_DIR = 20;

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const generated = resolve(__dirname, "./generated");

	await fs.rm(generated, { recursive: true, force: true });

	for (let d = 0; d < DIRS; d++) {
		const dir = resolve(generated, `dir${d}`);
		await fs.mkdir(dir, { recursive: true });
		await fs.mkdir(resolve(dir, "skip"), { recursive: true });

		for (let f = 0; f < FILES_PER_DIR; f++) {
			const ext = f % 4 === 0 ? "mjs" : "js";
			await fs.writeFile(
				resolve(dir, `file${f}.${ext}`),
				`export default ${f};\nexport const named = "dir${d}/file${f}";\n`
			);
		}

		await fs.writeFile(
			resolve(dir, "skip/excluded.js"),
			'export default "excluded";\n'
		);
	}
}
