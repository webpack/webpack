import fs from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import createApp from "../../harness/benchmark/create-app.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const generated = resolve(__dirname, "./generated");
const edited = resolve(
	generated,
	"./features/feature-0/components/Component0.js"
);

const EDIT = /\nexport const edit = \d+;\n$/;
let edits = 0;

export async function setup() {
	await createApp(generated, 8, 6);
}

/**
 * Edits one component, so each iteration restores the pack, invalidates that
 * module and stores the change: a dev server restarted after a code change.
 * @returns {Promise<void>}
 */
export async function beforeEachIteration() {
	// Iterations run in a worker, not the process that ran `setup()`.
	const content = (await fs.readFile(edited, "utf8")).replace(EDIT, "");

	await fs.writeFile(edited, `${content}\nexport const edit = ${edits++};\n`);
}
