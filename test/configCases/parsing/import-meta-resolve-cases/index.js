import { fileURLToPath } from "url";

// Cases mirrored from how Vite and Turbopack/Next exercise import.meta.resolve:
// resolving a sibling module, a nested path, a bare package specifier, a
// package subpath, and feeding the result to fileURLToPath.

it("should resolve a sibling module to its emitted asset URL", () => {
	const url = import.meta.resolve("./sibling.js");
	expect(typeof url).toBe("string");
	expect(url).toContain("sibling.js");
});

it("should resolve a nested path", () => {
	expect(import.meta.resolve("./dir/data.txt")).toContain("data.txt");
});

it("should resolve a bare package specifier to its main file", () => {
	expect(import.meta.resolve("pkg")).toContain("main.js");
});

it("should resolve a package subpath", () => {
	expect(import.meta.resolve("pkg/package.json")).toContain("package.json");
});

it("should produce a file URL usable with fileURLToPath", () => {
	const path = fileURLToPath(import.meta.resolve("./sibling.js"));
	expect(path).toContain("sibling.js");
});
