import fs from "fs";
import path from "path";

it("should dedupe a shared chunk loaded through the analyzable import", async () => {
	// `one` is requested from two sites concurrently and `vendor` is shared by both
	// chunks; each must still be installed and evaluated exactly once.
	const [a, b, c] = await Promise.all([
		import("./one"),
		import("./one"),
		import("./two")
	]);

	expect(a.value).toBe("one:vendor");
	expect(b.value).toBe("one:vendor");
	expect(c.value).toBe("two:vendor");
	expect(a).toBe(b);
	expect(global.__vendorEvaluations).toBe(1);
});

it("should emit the analyzable literal for the shared chunks", () => {
	// `runtimeChunk: "single"` puts the loader, and so the map, in its own chunk.
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "runtime.mjs"),
		"utf8"
	);
	// Needles are built at runtime so they are not source string literals here.
	const importMap = `${"chunkImports"} = {`;

	expect(bundle).toContain(importMap);
	expect(bundle).toContain('import("./one_js.mjs")');
	expect(bundle).toContain('import("./vendor.mjs")');
	// Every chunk is named here, so none is built from a chunk id.
	expect(bundle).not.toContain(`${"__webpack_require__"}.u =`);
});
