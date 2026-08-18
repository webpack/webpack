import fs from "fs";
import path from "path";

// Never awaited: `fetch` cannot reach a relative public path from the test harness.
export const load = () =>
	import(/* webpackChunkName: "shared-lazy" */ "./shared-lazy");

const read = (chunk) =>
	fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}-${chunk}`),
		"utf8"
	);

it("should keep the runtime form for the binary both runtimes reach", () => {
	expect(read("shared-lazy.mjs")).toContain(__RUNTIME_FORM__);
});

// Joined at runtime: this file is the web entry, so a needle written whole would be
// inlined into the very bundle the assertions read.
const needle = (...parts) => parts.join("");

it("should write the settled public path into the loader that names it", () => {
	const source = read("web.mjs");

	// `fetch` reads both the inlined path and the global against the document, so a
	// settled one is written out and the runtime module that sets it is not emitted.
	expect(source).toContain(needle("fetch(", '"./"', " + "));
	expect(source).not.toContain(needle("__webpack", "_require__.p = "));
});
