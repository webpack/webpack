import fs from "fs";
import path from "path";

it("should run the binary from chunks at different depths", async () => {
	const flat = await import(/* webpackChunkName: "flat" */ "./flat");
	expect(await flat.run()).toBe(42);
	// Pull in the second, deeper copy so the binary really sits at two depths.
	const deep = await import(/* webpackChunkName: "nested/deep" */ "./deep");
	expect(await deep.run()).toBe(42);
});

it("should bake the url each depth needs", () => {
	const read = (name) =>
		fs.readFileSync(path.join(__STATS__.outputPath, name), "utf8");

	expect(read("flat.mjs")).toMatch(/new URL\("\.\/[^"]+\.wasm"/);
	expect(read("nested/deep.mjs")).toMatch(/new URL\("\.\.\/[^"]+\.wasm"/);
	expect(read("flat.mjs")).not.toContain(`new URL(${"__webpack_require__"}.p + `);
});
