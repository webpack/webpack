import fs from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const items = Array.from({ length: 25 }).fill("wasm");

function generateData(i) {
	return `import { add, getNumber } from "../../wasm.wat?i=${i}";

export default function run() {
\treturn add(getNumber(), 2);
}
	`;
}

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const generated = resolve(__dirname, "./generated");

	await fs.rm(generated, { recursive: true, force: true });

	const filesDir = resolve(generated, "./files");

	await fs.mkdir(filesDir, { recursive: true });

	let code = "";

	for (const [i, item] of items.entries()) {
		const request = `./files/import-${item}-${i}.js`;
		const filename = resolve(generated, request);

		await fs.writeFile(filename, generateData(i + 1));

		const name = `importWasm${i}`;

		code += `import ${name} from ${JSON.stringify(request)};\nconsole.log(${name}());\nexport { ${name} };\n`;
	}

	await fs.writeFile(`${generated}/module.js`, code);
}
