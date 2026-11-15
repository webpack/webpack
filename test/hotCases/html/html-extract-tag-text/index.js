import html from "./page.html";

it("should patch the body and title from the page's own tags, not tag text in an attribute", (done) => {
	document.body.innerHTML = '<h1 id="hdr">version 1</h1>';
	document.title = "version 1";

	NEXT(
		require("../../update")(done, true, () => {
			expect(document.title).toBe("version 2");
			expect(document.body.innerHTML.trim()).toBe(
				'<h1 id="hdr">version 2</h1>'
			);
			expect(window.location.__reloadCount__ || 0).toBe(0);
			expect(html).toContain("<title>version 1</title>");
			done();
		})
	);
});
