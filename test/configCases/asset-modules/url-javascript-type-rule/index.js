import fs from "fs";

it("should emit a JavaScript file referenced by new URL() as an asset", () => {
	const url = new URL("./source.js", import.meta.url);
	expect(url.pathname.endsWith("/source.js")).toBe(true);
	expect(fs.existsSync(url)).toBe(true);
});

it("should inline a data: JavaScript URL referenced by new URL()", () => {
	const url = new URL("data:text/javascript,export default 1", import.meta.url);
	expect(url.protocol).toBe("data:");
});

it("should keep the rule type when a loader applies", () => {
	const url = new URL("./image.png", import.meta.url);
	if (FUTURE_DEFAULTS) {
		expect(url.pathname.endsWith("/image.png")).toBe(true);
		expect(fs.existsSync(url)).toBe(true);
	} else {
		expect(url.pathname.endsWith("/loader-result.png")).toBe(true);
	}
});
