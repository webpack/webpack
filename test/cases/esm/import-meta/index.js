const url = `file://${require("path").resolve("./test/cases/esm/import-meta/index.js")}`;

it("typeof import.meta === \"object\"", () => {
	expect(typeof import.meta).toBe("object");
});

it("typeof import.meta.url === \"string\"", () => {
	expect(typeof import.meta.url).toBe("string");
});

it("should return correct import.meta.url", () => {
	expect(import.meta.url).toBe(url);
});

it("should return correct import.meta", () => {
	const meta = import.meta;
	expect(meta.url).toBe(url);
});

it("should return undefined for unknown property", () => {
	const meta = import.meta;
	expect(import.meta.other).toBe(undefined);
	expect(meta.other).toBe(undefined);
});
