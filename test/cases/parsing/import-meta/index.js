const { pathToFileURL } = require("url");
const url = pathToFileURL(
	require("path").resolve("./test/cases/parsing/import-meta/index.js")
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
	expect(() => import.meta.other.other.other).toThrow();
});

it("should preserve properties when import.meta is assigned to a variable", () => {
	const meta = import.meta;
	expect(meta.url).toBe(url);
	expect(meta.webpack).toBe(webpackVersion);
	expect(typeof meta.main).toBe("boolean");
	expect(typeof meta.env).toBe("object");
});

it("should preserve properties when import.meta is returned from a function", () => {
	function getMeta() {
		return import.meta;
	}
	const meta = getMeta();
	expect(meta.url).toBe(url);
	expect(meta.webpack).toBe(webpackVersion);
});

it("should preserve properties when import.meta is passed as an argument", () => {
	function readUrl(meta) {
		return meta.url;
	}
	expect(readUrl(import.meta)).toBe(url);
});

it("should return the same object for import.meta", () => {
	expect(import.meta).toBe(import.meta);
	const a = import.meta;
	const b = import.meta;
	expect(a).toBe(b);
});

it("should support destructuring assignment", async () => {
	let version, url2, c;
	({ webpack: version } = { url: url2 } = { c } = import.meta);
	expect(version).toBeTypeOf("number");
	expect(url2).toBe(url);
	expect(c).toBe(undefined);

	let version2, url3, d;
	({ webpack: version2 } = await ({ url: url3 } = ({ d } = await import.meta)));
	expect(version2).toBeTypeOf("number");
	expect(url3).toBe(url);
	expect(d).toBe(undefined);
});