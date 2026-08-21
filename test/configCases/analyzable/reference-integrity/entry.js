import fs from "fs";
import path from "path";

// One of every reference analyzable output writes out.
export const chunk = () => import("./mods/a.js");
export const context = (name) => import(`./mods/${name}.js`);
export const stylesheet = () => import("./style.css");
export const prefetched = () => import(/* webpackPrefetch: true */ "./mods/b.js");
export const binary = () => import("./add.wat");
export const asset = new URL("./asset.txt", import.meta.url);
export const worker = () =>
	new Worker(new URL("./worker.js", import.meta.url), { type: "module" });

const walk = (directory) => {
	const found = [];
	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const full = path.join(directory, entry.name);
		if (entry.isDirectory()) found.push(...walk(full));
		else found.push(full);
	}
	return found;
};

it("should resolve every written-out reference to a file that was emitted", () => {
	const root = __STATS__.children[__INDEX__].outputPath;
	const files = walk(root).filter((f) => /\.(mjs|css)$/.test(f));

	expect(files.length).toBeGreaterThan(1);

	const dangling = [];
	for (const file of files) {
		const text = fs.readFileSync(file, "utf8");
		// Resolved against the file that carries it, which is what the browser does.
		for (const match of text.matchAll(
			/(?:new URL|import)\(\s*"(\.{1,2}\/[^"]*)"/g
		)) {
			if (!fs.existsSync(path.resolve(path.dirname(file), match[1]))) {
				dangling.push(`${path.relative(root, file)} -> ${match[1]}`);
			}
		}
	}

	expect(dangling).toEqual([]);
});

it("should leave no reserved name behind and call nothing it did not ship", () => {
	const root = __STATS__.children[__INDEX__].outputPath;
	const files = walk(root).filter((f) => f.endsWith(".mjs"));
	// Needles are built at runtime so they are not source string literals here.
	const token = (...parts) => parts.join("");
	const undeclared = [];

	for (const file of files) {
		const text = fs.readFileSync(file, "utf8");

		expect(text).not.toContain(token("@@webpack", "AnalyzableChunk"));
		expect(text).not.toContain(token("@@webpack", "FullHash"));

		// Only the entry carries the runtime; a chunk reads what it defined. Named
		// rather than inferred from depth, since one config emits its entry nested.
		if (path.basename(file) !== `${__NAME__}.mjs`) continue;
		for (const helper of ["u", "k", "p", "b"]) {
			const used =
				text.includes(token("__webpack_require__.", helper, "(")) ||
				text.includes(token("__webpack_require__.", helper, " +"));
			if (used && !text.includes(token("__webpack_require__.", helper, " = "))) {
				undeclared.push(`${path.relative(root, file)} .${helper}`);
			}
		}
	}

	expect(undeclared).toEqual([]);
});
