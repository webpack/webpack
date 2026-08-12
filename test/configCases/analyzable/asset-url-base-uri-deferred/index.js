import fs from "fs";
import path from "path";
import { url } from "./shared";

// Needle built at runtime so it is not a source string literal here.
const baked = `${"/* asset"} import */ "`;
const expected = `${__BASE__}${__STATS__.hash}/asset.txt`;

it("should resolve the asset against the base through the deferred pass", () => {
	expect(url.href).toBe(expected);
});

it("should settle the whole url rather than read the base from the runtime", () => {
	const source = fs.readFileSync(
		path.join(__STATS__.outputPath, "main.mjs"),
		"utf8"
	);
	expect(source).toContain(`${baked}${expected}"`);
	expect(source).not.toContain(`${"__webpack_require__"}.b`);
	// The stand-in must not survive into the bundle.
	expect(source).not.toContain(`${"webpackAnalyzable"}Chunk`);
});
