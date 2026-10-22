import html from "./page.html";

it("should hot-update an HTML module with a <script src> reference", (done) => {
	// `<script src="./external.js">` was rewritten to a chunk URL —
	// `external.js` itself is a separate entry chunk, not inlined into
	// the HTML string.
	expect(html).toContain("script src v1");
	expect(html).not.toContain("./external.js");
	expect(html).toMatch(/<script src="[^"]+\.js"/);

	NEXT(
		require("../../update")(done, true, () => {
			// HMR succeeded for both modules: the HTML string is the v2 shape, proving the
			// HTML module self-accepted with the new content, and the rewritten script src
			// keeps its shape since the chunk filename derives from a stable per-module hash.
			const updated = require("./page.html");
			expect(updated).toContain("script src v2");
			expect(updated).not.toContain("script src v1");
			expect(updated).toMatch(/<script src="[^"]+\.js"/);
			done();
		})
	);
});
