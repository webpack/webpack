import fs from "fs";
import path from "path";

// Named exports make each of these an ESM library, so the analyzable literal is
// asserted next to the library's own `export { ... }`. The loader is exported rather
// than called behind a flag: a reference nothing exports is shaken out, taking the
// chunk with it.
export const value = 42;
export const load = () => import(/* webpackChunkName: "lazy" */ "./lazy");

const bundle = () =>
	fs.readFileSync(
		path.join(__STATS__.children[0].outputPath, `bundle${__INDEX__}.mjs`),
		"utf8"
	);

if (__ON_DISK__) {
	it("should load the chunk a module library names by a literal", async () => {
		const lazy = await load();

		expect(lazy.value).toBe("lazy");
	});
}

it("should bake a literal chunk specifier into a module library", () => {
	const source = bundle();
	// Built at runtime so the needle is not a source string literal here.
	const helper = `${"__webpack_require__"}.ei(`;

	expect(source).toContain(helper);
	expect(source).toMatch(/export\s*\{/);

	const specifier = /import\((?:\/\*[^*]*\*\/\s*)?"([^"]+)"\)/.exec(
		source.slice(source.indexOf(helper))
	);

	expect(specifier).not.toBe(null);
	if (__ON_DISK__) {
		// Whatever the name holds, what is baked has to be a file on disk.
		expect(
			fs.existsSync(path.join(__STATS__.children[0].outputPath, specifier[1]))
		).toBe(true);
	} else {
		// The public path carries the compilation hash, so the deferred pass filled it
		// in rather than leaving a stand-in behind.
		expect(specifier[1]).toMatch(
			/^https:\/\/cdn\.example\.invalid\/[\da-f]+\/2-lazy\.mjs$/
		);
	}
});
