import fs from "fs";
import path from "path";

export const asset = new URL("./thing.txt", import.meta.url);
export const hinted = new URL(/* webpackPreload: true */ "./hint.png", import.meta.url);

it("should load the hinted chunks and the stylesheet under an eval devtool", async () => {
	// A syntax error inside a wrapper would surface here, when the module runs.
	const [lazy, pre] = await Promise.all([
		import(/* webpackChunkName: "lazy", webpackPrefetch: true */ "./lazy.js"),
		import(/* webpackChunkName: "pre", webpackPreload: true */ "./pre.js"),
		import("./style.css")
	]);

	expect(lazy.default).toBe("lazy");
	expect(pre.default).toBe("pre");
});

it("should write the runtime module urls out but not a module's own", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}.mjs`),
		"utf8"
	);

	// A runtime module is emitted beside the wrappers, so its maps are written out.
	expect(bundle).toContain(`${"chunk"}Urls = {`);
	expect(bundle).toContain(`${"css"}Urls = {`);
	// Module code is wrapped, where `import.meta` is a syntax error, so it keeps the
	// runtime form.
	expect(bundle).not.toContain(`"./${__NAME__}-thing.txt", import.meta.url)`);
	// Quotes inside the wrapper are escaped, so this asserts on the unquoted tail:
	// the module builds its url against the runtime baseURI instead.
	expect(bundle).toContain(`${"__webpack_require__"}.b)`);
	// The startup hint is written by a runtime module, so its href is written out.
	expect(bundle).toContain(`"./${__NAME__}-hint.png", import.meta.url).href`);
});
