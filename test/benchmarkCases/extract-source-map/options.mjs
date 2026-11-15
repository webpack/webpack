import fs from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

/**
 * @returns {Promise<void>} resolves when the fixture is ready
 */
export async function setup() {
	const generated = resolve(
		dirname(fileURLToPath(import.meta.url)),
		"generated"
	);
	const source = `module.exports = ${JSON.stringify("value".repeat(4000))};`;
	// A long line followed by adjacent comments exposes repeated prefix scans.
	const trailing = " /* ordinary trailing comment */".repeat(128);
	await fs.mkdir(generated, { recursive: true });
	await fs.writeFile(
		resolve(generated, "module.js"),
		`${source} /*# sourceMappingURL=source.map */${trailing}`
	);
	await fs.writeFile(
		resolve(generated, "source.map"),
		JSON.stringify({
			version: 3,
			sources: ["original.js"],
			sourcesContent: [source],
			names: [],
			mappings: "AAAA"
		})
	);
}
