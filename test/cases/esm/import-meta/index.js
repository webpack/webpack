const { pathToFileURL } = require("url");
const url = pathToFileURL(
	require("path").resolve("./test/cases/esm/import-meta/index.js")
).toString();
const webpackVersion = parseInt(
	require("../../../../package.json").version,
	10
);

it('typeof import.meta === "object"', () => {
	expect(typeof import.meta).toBe("object");
	if (typeof import.meta !== "object") require("fail");
});

it('typeof import.meta.url === "string"', () => {
	expect(typeof import.meta.url).toBe("string");
	if (typeof import.meta.url !== "string") require("fail");
});

it('typeof import.meta.webpack === "number"', () => {
	expect(typeof import.meta.webpack).toBe("number");
	if (typeof import.meta.webpack !== "number") require("fail");
});

it("should return correct import.meta.url", () => {
	expect(import.meta.url).toBe(url);
	expect(import.meta["url"]).toBe(url);
	expect("my" + import.meta.url).toBe("my" + url);
	if (import.meta.url.indexOf("index.js") === -1) require("fail");
});

it("should return correct import.meta.webpack", () => {
	expect(import.meta.webpack).toBe(webpackVersion);
	if (import.meta.webpack < 5) require("fail");
	if (import.meta.webpack >= 5) {
	} else {
		require("fail");
	}
});

it("should return undefined for unknown property", () => {
	expect(import.meta.other).toBe(undefined);
	if (typeof import.meta.other !== "undefined") require("fail");
	expect(() => import.meta.other.other.other).toThrowError();
	// if (typeof import.meta.other.other.other !== "undefined") require("fail");
});
