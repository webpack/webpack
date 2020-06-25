const { pathToFileURL } = require("url");
const url =
	pathToFileURL(
		require("path").resolve("./test/cases/esm/import-meta/index.js")
	).toString();

it("typeof import.meta === \"object\"", () => {
	expect(typeof import.meta).toBe("object");
});

it("typeof import.meta.url === \"string\"", () => {
	expect(typeof import.meta.url).toBe("string");
});

it("should return correct import.meta.url", () => {
	expect(import.meta.url).toBe(url);
	expect("my" + import.meta.url).toBe("my" + url);
});

it("should return correct import.meta", () => {
	expect(import.meta["url"]).toBe(url);
});

it("should return undefined for unknown property", () => {
	expect(import.meta.other).toBe(undefined);
});
