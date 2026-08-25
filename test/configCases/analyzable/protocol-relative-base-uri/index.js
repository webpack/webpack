import fs from "fs";
import path from "path";

const url = new URL("./asset.txt", import.meta.url);

it("should keep the base protocol-relative and let the load settle it", () => {
	// The scheme comes from this module's own url, exactly as it did when the runtime
	// built the base with `new URL("//cdn.example/", import.meta.url)`.
	const scheme = new URL(import.meta.url).protocol;

	expect(url.href).toBe(`${scheme}//cdn.example/asset.txt`);

	const source = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	expect(source).toContain('"//cdn.example/asset.txt"');
	// Nothing reads the base any more, so the runtime module that set it is gone.
	expect(source).not.toContain(`${"__webpack_require__"}.b =`);
});
