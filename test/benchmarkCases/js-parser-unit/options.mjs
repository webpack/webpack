import fs from "fs/promises";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const { jsMinify } = createRequire(import.meta.url)(
	"../../../lib/index.js"
).javascript;

export async function setup() {
	const source = await fs.readFile(
		fileURLToPath(import.meta.resolve("three")),
		"utf8"
	);
	const { code } = await jsMinify({ "three.module.js": source }, undefined, {
		module: true
	});

	if (!code) {
		throw new Error("Failed to minify the three ESM fixture");
	}

	const outputPath = fileURLToPath(
		new URL("../../js/benchmark/three.module.min.js", import.meta.url)
	);

	await fs.mkdir(new URL("../../js/benchmark/", import.meta.url), {
		recursive: true
	});
	await fs.writeFile(outputPath, code);
}
