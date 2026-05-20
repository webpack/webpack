import html from "./page.html";

it("should hot-update an HTML module with a <link rel=stylesheet> reference", (done) => {
	// `<link rel="stylesheet" href="./style.css">` was rewritten to point
	// at the bundled CSS chunk — the CSS body itself is not inlined into
	// the HTML string.
	expect(html).toContain("link stylesheet v1");
	expect(html).not.toContain("./style.css");
	expect(html).toMatch(/<link[^>]+rel="stylesheet"[^>]+href="[^"]+\.css"/);

	NEXT(
		require("../../update")(done, true, () => {
			// The HTML module self-accepted on the title change and the
			// rewritten link href still points at the (separately
			// hot-updatable) CSS chunk.
			const updated = require("./page.html");
			expect(updated).toContain("link stylesheet v2");
			expect(updated).not.toContain("link stylesheet v1");
			expect(updated).toMatch(/<link[^>]+rel="stylesheet"[^>]+href="[^"]+\.css"/);
			done();
		})
	);
});
