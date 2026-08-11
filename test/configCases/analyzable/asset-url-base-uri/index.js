import fs from "fs";
import path from "path";

export const url = new URL("./asset.txt", import.meta.url);

it("should resolve the asset against the entry's baseUri", () => {
	expect(url.href).toBe("https://example.com/base/asset.txt");
});

it("should keep the runtime form so the base is the one the runtime knows", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// Needle built at runtime so it is not a source string literal here.
	const baked = `${"/* asset"} import */ "`;

	expect(bundle).not.toContain(baked);
	expect(bundle).toContain(`${"__webpack_require__"}.b`);
});
