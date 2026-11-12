import fs from "fs";

const source = new URL("./source.js", import.meta.url);

it("should emit a JavaScript file referenced by new URL() as an asset", () => {
	if (CASE === "url-rule") {
		expect(source.protocol).toBe("data:");
		return;
	}
	const emitted = source.pathname.endsWith(`/${CASE}/source.js`);
	// a rule keeping a loader's module keeps the earlier behavior everywhere
	expect(emitted).toBe(CASE !== "loader-rule");
	if (!emitted) return;
	expect(fs.existsSync(source)).toBe(true);
});

it("should inline a data: JavaScript URL referenced by new URL()", () => {
	if (CASE !== "type-rule" && CASE !== "future") return;
	const url = new URL("data:text/javascript,export default 1", import.meta.url);
	expect(url.protocol).toBe("data:");
});

it("should emit the loader result as an asset only with futureDefaults", () => {
	if (CASE !== "loader-rule" && CASE !== "future") return;
	const url = new URL("./image.png", import.meta.url);
	if (CASE === "loader-rule") {
		expect(url.pathname.endsWith("/loader-result.png")).toBe(true);
		return;
	}
	expect(url.pathname.endsWith("/image.png")).toBe(true);
	expect(fs.readFileSync(url, "utf8")).toContain("loader-result.png");
});
