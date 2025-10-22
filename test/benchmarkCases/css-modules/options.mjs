import fs from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const items = Array.from({ length: 10 }).fill("css");

function generateCSS(i, current) {
	let css = "";

	for (let c = i; c >= 0; c--) {
		css += `.class-${c} { color: red; }\n`;
	}

	return css;
}

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const generated = resolve(__dirname, "./generated");

	await fs.rm(generated, { recursive: true, force: true });

	const filesDir = resolve(generated, "./files");

	await fs.mkdir(filesDir, { recursive: true });

	let code = "";

	for (const [i, item] of items.entries()) {
		const request = `./files/initial-${item}-${i}.css`;
		const filename = resolve(generated, request);

		await fs.writeFile(filename, generateCSS(i));

		code += `import ${JSON.stringify(`${request}?i=${i}`)};`;
	}

	for (const [i, item] of items.entries()) {
		const request = `./files/initial-${item}-${i}.modules.css`;
		const filename = resolve(generated, request);

		await fs.writeFile(filename, generateCSS(i));

		const name = `importCSS${i}`;

		code += `import * as ${name} from ${JSON.stringify(request)};\nconsole.log(${name});\nexport { ${name} };\n`;
	}

	for (const [i, item] of items.entries()) {
		const request = `./files/dynamic-${item}-${i}.css`;
		const filename = resolve(generated, request);

		await fs.writeFile(filename, generateCSS(i));

		code += `await import(${JSON.stringify(request)});\n`;
	}

	for (const [i, item] of items.entries()) {
		const request = `./files/dynamic-${item}-${i}.modules.css`;
		const filename = resolve(generated, request);

		await fs.writeFile(filename, generateCSS(i));

		const name = `importDynCSS${i}`;

		code += `const ${name} = await import(${JSON.stringify(request)});\nconsole.log(${name});\nexport { ${name} };\n`;
	}

	await fs.writeFile(`${generated}/module.js`, code);
}
