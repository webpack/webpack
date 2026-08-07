import fs from "fs";
import path from "path";

__webpack_public_path__ = "";

it("should instantiate wasm when the public path is overridden at runtime", () =>
	import("./module").then((m) => {
		expect(m.run()).toBe(3);
	}));

it("should keep the loader and the call site on the same form", () => {
	const dir = __STATS__.outputPath;
	// The call site can't bake a url here, so the reader must supply the base itself.
	const callSite = fs.readFileSync(
		path.join(dir, "module_js.bundle0.mjs"),
		"utf8"
	);
	const runtime = fs.readFileSync(path.join(dir, "bundle0.mjs"), "utf8");

	expect(callSite).toContain(`${"__webpack_require__"}.v(exports, module.id`);
	expect(runtime).toContain(`readFile(new ${"URL"}(`);
});
