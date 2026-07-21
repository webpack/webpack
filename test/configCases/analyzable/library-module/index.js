import fs from "fs";
import path from "path";

// A named export makes this an ESM library (`output.library.type: "module"`),
// exercising the analyzable literal alongside the emitted `export { ... }`.
export const value = 42;

it("should load the dynamically imported chunk from a module library", async () => {
	const { default: v } = await import(
		/* webpackChunkName: "dynamic" */ "./dynamic.js"
	);

	expect(v).toBe(42);
	expect(value).toBe(42);
});

it("should emit an analyzable literal import() for a module library", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// Library output still emits the analyzable helper + literal specifier that a
	// foreign bundler can follow, next to the library's own `export` statements.
	expect(bundle).toContain('import(/*! import() | dynamic */ "./dynamic.mjs")');
	expect(bundle).toContain(`${"__webpack_require__"}.ei(`);
	expect(bundle).toMatch(/export\s*\{/);
});
