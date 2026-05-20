import html from "./page.html";

it("should ignore <body> / <title> markers that appear inside HTML comments", (done) => {
	// Sanity: the source has decoy tags inside comments — they survive
	// into the rewritten HTML because dependencies don't rewrite comment
	// bodies. The HMR shim must NOT pick them up.
	expect(html).toContain("fake-title-1");
	expect(html).toContain("fake body 1");

	// Initial DOM setup, just like the html-extract test.
	document.body.innerHTML = "<h1>real body v1</h1>";
	document.title = "real title v1";
	expect(window.location.__reloadCount__ || 0).toBe(0);

	NEXT(
		require("../../update")(done, true, () => {
			// On hot update the shim's comment-stripping + tag regex
			// picks up the REAL title (`real title v2`) and REAL body
			// (`<h1>real body v2</h1>`), NOT the comment decoys.
			expect(document.title).toBe("real title v2");
			expect(document.body.innerHTML).toContain("real body v2");
			expect(document.body.innerHTML).not.toContain("real body v1");
			// And the comment decoys never leaked into the patched DOM.
			expect(document.title).not.toContain("fake-title");
			expect(document.body.innerHTML).not.toContain("decoy");
			expect(document.body.innerHTML).not.toContain("fake body");
			// Head sans title is stable (just the static <meta>), so
			// the shim took the DOM-patch path, not the reload path.
			expect(window.location.__reloadCount__ || 0).toBe(0);
			done();
		})
	);
});
