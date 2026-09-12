import fs from "fs";
import path from "path";

// Reference the chunk statically so it is emitted, but don't execute the load —
// the assertion only inspects the generated source.
const load = () => import(/* webpackFetchPriority: "high" */ "./dynamic.js");

it("should still emit the analyzable form when a fetchPriority hint is set", () => {
	expect(typeof load).toBe("function");

	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// A native `import()` cannot carry the hint, but `ensureChunk` hands it to every
	// handler, one of which puts it on a `modulepreload` link.
	expect(bundle).toContain(`${"chunkImports"} = {`);
	expect(bundle).toContain(`${"__webpack_require__"}.e(`);
	expect(bundle).toContain(`${'"hi'}${'gh"'}`);
});
