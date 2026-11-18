import fs from "fs";
import path from "path";

/**
 * @returns {Worker} a worker, never started by the test
 */
export function startWorker() {
	return new Worker(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
}

it("should emit assets and workers referenced with import.meta.url and keep bare import.meta.url", () => {
	const files = fs.readdirSync(__STATS__.children[__STATS_I__].outputPath);
	expect(files.some(file => file.endsWith(".txt"))).toBe(true);
	expect(files.some(file => file.startsWith("worker"))).toBe(true);

	const bundle = fs.readFileSync(
		path.join(__STATS__.children[__STATS_I__].outputPath, "bundle0.mjs"),
		"utf8"
	);
	// Needles built at runtime so the assertions don't self-match the source.
	expect(bundle).toMatch(
		/new URL\(\/\* asset import \*\/ "\.\/[0-9a-f]+\.txt", import\.meta\.url\)/
	);
	expect(bundle).toMatch(
		/new URL\(\/\* worker import \*\/ "\.\/[^"]+\.mjs", import\.meta\.url\)/
	);
	expect(bundle).toContain(`const moduleUrl = ${"import.meta"}.url;`);
	expect(bundle).not.toContain(`${"file"}://`);
});

export const dataUrl = new URL("./data.txt", import.meta.url);
export const moduleUrl = import.meta.url;
