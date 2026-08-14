import fs from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import createSvg from "../../harness/benchmark/create-svg.mjs";
import memoryScaledCount from "../../harness/benchmark/scale.mjs";

// Large graph in memory mode only (see scale.mjs); small for simulation/walltime.
const items = Array.from({ length: memoryScaledCount(25, 500) }).fill("image");

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const generated = resolve(__dirname, "./generated");

	await fs.rm(generated, { recursive: true, force: true });

	const filesDir = resolve(generated, "./files");

	await fs.mkdir(filesDir, { recursive: true });

	let code = "";

	for (const [i, item] of items.entries()) {
		const request = `./files/import-${item}-${i}.svg`;
		const filename = resolve(generated, request);

		await fs.writeFile(filename, createSvg(`Import, Number - ${i}`));

		const name = `importImage${i}`;

		code += `import ${name} from ${JSON.stringify(request)};\nconsole.log(${name});\nexport { ${name} };\n`;
	}

	for (const [i, item] of items.entries()) {
		const request = `./files/import-with-${item}-${i}.svg`;
		const filename = resolve(generated, request);

		await fs.writeFile(filename, createSvg(`Import With, Number - ${i}`));

		const name = `importWithImage${i}`;

		code += `import ${name} from ${JSON.stringify(request)} with { type: "text" };\nconsole.log(${name});\nexport { ${name} };\n`;
	}

	await fs.writeFile(`${generated}/module.js`, code);
}
