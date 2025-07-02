const { pathToFileURL } = require("url");
const url = pathToFileURL(
	require("path").resolve("./test/cases/esm/import-meta/index.js")
).toString();
const webpackVersion = parseInt(
	require("../../../../package.json").version,
	10
);
const devProdCondition = require('echo-dev-condition').default;

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

it("should return correct import.meta.DEBUG", () => {
	if (devProdCondition === '<unset>') {
		// If nothing else, import.meta.DEBUG should be falsey (e.g. undefined).
		expect(import.meta.DEBUG).toBeFalsy();
	} else {
		expect(import.meta.DEBUG).toBe(devProdCondition === '<dev>');
	}
	expect(!!import.meta.DEBUG).toBe(process.env.NODE_ENV === 'development');
	if (typeof import.meta.DEBUG !== "boolean") require("fail");
	if (import.meta.DEBUG !== false && import.meta.DEBUG !== true) require("fail");
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

it("should add warning on direct import.meta usage", () => {
	expect(Object.keys(import.meta)).toHaveLength(0);
});

it("should support destructuring assignment", () => {
	let version, url2, c;
	({ webpack: version } = { url: url2 } = { c } = import.meta);
	expect(version).toBeTypeOf("number");
	expect(url2).toBe(url);
	expect(c).toBe(undefined);
});
