import fs from "fs";
import path from "path";
import "./eager.css";

it("should load a chunk whose payload is css", async () => {
	await import(/* webpackChunkName: "lazy-css" */ "./lazy.css");
});

it("should name that chunk with a specifier a foreign bundler can follow", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	const ensureChunkCall = `${"__webpack_require__"}.e(`;

	expect(bundle).toContain(
		'import(/*! import() | lazy-css */ "./lazy-css.mjs")'
	);
	expect(bundle).not.toContain(ensureChunkCall);
});

it("should bake the href of the css that chunk carries", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);

	expect(bundle).toContain("lazy-css.css");
	expect(fs.existsSync(path.join(__STATS__.outputPath, "lazy-css.css"))).toBe(
		true
	);
});
