import fs from "fs";
import path from "path";

// Never called: the plugin renamed the chunk this names, so loading it fails.
export const lazy = () => import(/* webpackChunkName: "lazy" */ "./lazy.js");

it("should write a specifier the renamed chunk no longer answers to", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);

	expect(bundle).toContain('"./lazy.mjs"');
	expect(fs.existsSync(path.join(__STATS__.outputPath, "lazy.mjs"))).toBe(
		false
	);
	expect(
		fs.existsSync(path.join(__STATS__.outputPath, "renamed-by-plugin.mjs"))
	).toBe(true);
});
