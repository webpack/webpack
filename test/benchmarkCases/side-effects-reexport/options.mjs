import fs from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const depsSize = 1000;

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const generated = resolve(__dirname, "./generated");

	await fs.rm(generated, { recursive: true, force: true });
	await fs.mkdir(generated, { recursive: true });

	// Generate individual dependency files
	for (let i = 0; i < depsSize; i++) {
		const content = `export function dependency${i}() {
	return "${i}";
}
`;
		await fs.writeFile(resolve(generated, `dependency${i}.js`), content);
	}

	// Generate the barrel file that re-exports all dependencies
	const reexports = Array.from(
		{ length: depsSize },
		(_, i) => `export * from "./dependency${i}.js";`
	).join("\n");
	await fs.writeFile(resolve(generated, "dependency.js"), reexports);

	// Generate the component file
	const imports = Array.from(
		{ length: depsSize },
		(_, i) => `dependency${i}`
	).join(", ");
	const componentContent = `export { ${imports} } from "./dependency.js";
export function component(...args) {
	return [${imports}];
}
`;
	await fs.writeFile(resolve(generated, "component.js"), componentContent);
}
