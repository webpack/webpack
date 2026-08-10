import stylesheet from "./stylesheet";

const meta = import.meta;
const { url, hot } = import.meta;

it("should keep native import.meta semantics in emitted output", () => {
	expect(import.meta.url).toMatch(/index\.js$/);
	expect(meta.url).toBe(import.meta.url);
	expect(url).toBe(import.meta.url);
	expect(typeof hot).toBe("undefined");
	expect(typeof import.meta.hot).toBe("undefined");
});

it("should provide import.meta in build-time executed modules with ESM output", () => {
	const parts = new Map(
		stylesheet.split(" ").map((part) => part.split("=", 1).concat(part.slice(part.indexOf("=") + 1)))
	);
	expect(parts.get("url")).toMatch(/^file:.*stylesheet\.js$/);
	expect(parts.get("aliasUrl")).toBe(parts.get("url"));
	expect(parts.get("destructuredUrl")).toBe(parts.get("url"));
	expect(parts.get("spreadUrlType")).toBe("string");
	expect(parts.get("unknownType")).toBe("undefined");
});
