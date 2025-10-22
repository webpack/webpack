import fs from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const items = Array.from({ length: 25 }).fill("file");

function generateDefaultMod(i) {
	return `export default ${i}`;
}

function generateNamedMod(i) {
	return `const myVar = ${i}; export { myVar }`;
}

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const generated = resolve(__dirname, "./generated");

	await fs.rm(generated, { recursive: true, force: true });

	const filesDir = resolve(generated, "./files");

	await fs.mkdir(filesDir, { recursive: true });

	let code = "";

	// Default export

	for (const [i, item] of items.entries()) {
		const request = `./files/default-${item}-${i}.js`;
		const filename = resolve(generated, request);

		await fs.writeFile(filename, generateDefaultMod(i));

		const name = `importDefault${i}`;

		code += `import ${name} from ${JSON.stringify(request)};\nconsole.log(${name});\nexport { ${name} };\n`;
	}

	// Named export

	for (const [i, item] of items.entries()) {
		const request = `./files/named-${item}-${i}.js`;
		const filename = resolve(generated, request);

		await fs.writeFile(filename, generateNamedMod(i));

		const name = `importNamed${i}`;

		code += `import { myVar as ${name} } from ${JSON.stringify(request)};\nconsole.log(${name});\nexport { ${name} };\n`;
	}

	// Namespace import

	for (const [i, item] of items.entries()) {
		const request = `./files/namespace-${item}-${i}.js`;
		const filename = resolve(generated, request);

		await fs.writeFile(filename, generateNamedMod(i));

		const name = `importNamespace${i}`;

		code += `import * as ${name} from ${JSON.stringify(request)};\nconsole.log(${name}.myVar);\nexport { ${name} };\n`;
	}

	// Re-export import

	for (const [i, item] of items.entries()) {
		const originalRequest = `mod-for-re-export-${item}-${i}.js`;
		const request = `./files/${originalRequest}`;
		const filename = resolve(generated, request);

		await fs.writeFile(filename, generateNamedMod(i));

		const reExportRequest = `./files/re-export-${item}-${i}.js`;

		await fs.writeFile(
			resolve(generated, reExportRequest),
			`export * from ${JSON.stringify(`./${originalRequest}`)};`
		);

		const name = `importReExport${i}`;

		code += `import * as ${name} from ${JSON.stringify(reExportRequest)};\nconsole.log(${name}.myVar);\nexport { ${name} };\n`;
	}

	await fs.writeFile(`${generated}/module.js`, code);
}
