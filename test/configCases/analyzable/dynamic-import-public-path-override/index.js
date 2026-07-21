import fs from "fs";
import path from "path";

// Reassign the public path at runtime, then reference the chunk statically (the
// load is never executed — the assertion only inspects the generated source).
__webpack_public_path__ = "https://cdn.runtime.example.com/";
const load = () => import(/* webpackChunkName: "dynamic" */ "./dynamic.js");

it("should keep the runtime form when the public path is overridden at runtime", () => {
	expect(typeof load).toBe("function");

	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// The `__webpack_public_path__ = …` assignment still compiles to a `.p` write.
	expect(bundle).toContain(`${"__webpack_require__"}.p =`);
	// A baked literal can't reflect that override, so the runtime ensureChunk form
	// (which reads `__webpack_require__.p`) is kept instead of the analyzable `.ei`.
	expect(bundle).toContain(`${"__webpack_require__"}.e(`);
	expect(bundle).not.toContain(`${"__webpack_require__"}.ei(`);
});
