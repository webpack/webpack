import stylesheet from "./stylesheet";

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
