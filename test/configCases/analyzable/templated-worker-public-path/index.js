import fs from "fs";
import path from "path";

// Referenced so the worker chunk exists, never started — the harness cannot fetch an
// absolute CDN url.
const spawn = () =>
	new Worker(new URL("./worker.js", import.meta.url), { type: "module" });

it("should bake a worker's own templated public path", () => {
	expect(typeof spawn).toBe("function");

	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	const specifier = bundle.match(
		/\/\* worker import \*\/ "(https:\/\/cdn\.example\.com\/[^"]+)"/
	);

	expect(specifier).not.toBe(null);
	const [, hash, file] = specifier[1]
		.split("https://cdn.example.com/")[1]
		.match(/^([^/]+)\/(.+)$/);

	expect(hash).toBe(__STATS__.hash);
	// The name in the specifier is the one that reached disk.
	expect(fs.existsSync(path.join(__STATS__.outputPath, file))).toBe(true);
});
