import fs from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const items = Array.from({ length: 25 }).fill("file");

const LEVEL_PREFIX = "level_";

function generateData(depth, text, currentDepth = 0) {
	if (currentDepth >= depth) {
		return text;
	}

	const obj = {};
	obj[`${LEVEL_PREFIX}${currentDepth}`] = generateData(
		depth,
		text,
		currentDepth + 1
	);
	return obj;
}

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const generated = resolve(__dirname, "./generated");

	await fs.rm(generated, { recursive: true, force: true });

	const filesDir = resolve(generated, "./files");

	await fs.mkdir(filesDir, { recursive: true });

	let code = "";
	let level = "";

	for (const [i, item] of items.entries()) {
		const request = `./files/import-${item}-${i}.json`;
		const filename = resolve(generated, request);

		await fs.writeFile(
			filename,
			JSON.stringify(generateData(i + 1, `Import, Number - ${i}`))
		);

		const name = `importJSON${i}`;
		level += `.${LEVEL_PREFIX}${i}`;

		code += `import ${name} from ${JSON.stringify(request)};\nconsole.log(${name}${level});\nexport { ${name} };\n`;
	}

	level = "";

	for (const [i, item] of items.entries()) {
		const request = `./files/import-with-${item}-${i}.json`;
		const filename = resolve(generated, request);

		await fs.writeFile(
			filename,
			JSON.stringify(generateData(i + 1, `Import With, Number - ${i}`))
		);

		const name = `importWithJSON${i}`;
		level += `.${LEVEL_PREFIX}${i}`;

		code += `import ${name} from ${JSON.stringify(request)} with { type: "json" };\nconsole.log(${name}${level});\nexport { ${name} };\n`;
	}

	await fs.writeFile(`${generated}/module.js`, code);
}
