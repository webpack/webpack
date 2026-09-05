import fs from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import createSvg from "../../harness/benchmark/create-svg.mjs";
import memoryScaledCount from "../../harness/benchmark/scale.mjs";

// Large graph in memory mode only — see scale.mjs; keeps the simulation bench small.
const items = Array.from({ length: memoryScaledCount(25, 500) }).fill("image");

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const generated = resolve(__dirname, "./generated");

	await fs.rm(generated, { recursive: true, force: true });

	const filesDir = resolve(generated, "./files");

	await fs.mkdir(filesDir, { recursive: true });

	let code = "";

	for (const [i, item] of items.entries()) {
		const request = `./files/new-url-${item}-${i}.svg`;
		const filename = resolve(generated, request);

		await fs.writeFile(filename, createSvg(`new URL, Number - ${i}`));

		const name = `urlImage${i}`;

		code += `const ${name} = new URL(${JSON.stringify(request)}, import.meta.url);\nconsole.log(${name});\nexport { ${name} };\n`;
	}

	for (const [i, _item] of items.entries()) {
		const base64 = Buffer.from(
			createSvg(`Data URI URL, Number - ${i}`),
			"utf8"
		).toString("base64");

		const name = `urlDataImage${i}`;

		code += `const ${name} = new URL(${JSON.stringify(`data:image/svg+xml;base64,${base64}`)}, import.meta.url);\nconsole.log(${name});\nexport { ${name} };\n`;
	}

	// import ... from ... code

	for (const [i, item] of items.entries()) {
		const request = `./files/import-${item}-${i}.svg`;
		const filename = resolve(generated, request);

		await fs.writeFile(filename, createSvg(`Import, Number - ${i}`));

		const name = `importImage${i}`;

		code += `import ${name} from ${JSON.stringify(request)};\nconsole.log(${name});\nexport { ${name} };\n`;
	}

	for (const [i, _item] of items.entries()) {
		const base64 = Buffer.from(
			createSvg(`Import Data URI, Number - ${i}`),
			"utf8"
		).toString("base64");

		const name = `dataURIImage${i}`;

		code += `import ${name} from ${JSON.stringify(`data:image/svg+xml;base64,${base64}`)};\nconsole.log(${name});\nexport { ${name} };\n`;
	}

	await fs.writeFile(`${generated}/module.js`, code);
}
