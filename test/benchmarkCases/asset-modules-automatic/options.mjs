import fs from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import createSvg from "../../harness/benchmark/create-svg.mjs";

const items = Array.from({ length: 25 }).fill("image");

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const generated = resolve(__dirname, "./generated");

	await fs.rm(generated, { recursive: true, force: true });

	const filesDir = resolve(generated, "./files");

	await fs.mkdir(filesDir, { recursive: true });

	let code = "";

	for (const [i, item] of items.entries()) {
		const request = `./files/import-${item}-${i}.svg`;

		// Alternating either side of `dataUrlCondition.maxSize`, so the automatic
		// type decides inline for half the assets and resource for the other half.
		await fs.writeFile(
			resolve(generated, request),
			createSvg(`Import, Number - ${i}`.padEnd(i % 2 === 0 ? 32 : 12_000, " "))
		);

		const name = `importImage${i}`;

		code += `import ${name} from ${JSON.stringify(request)};\nconsole.log(${name});\nexport { ${name} };\n`;
	}

	await fs.writeFile(`${generated}/module.js`, code);
}
