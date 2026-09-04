const stylesheets = () =>
	[...document.getElementsByTagName("link")].filter(
		(link) =>
			link.rel === "stylesheet" && /\/lazy_css\.[0-9a-f]+\.css/.test(link.href)
	);

it("should reload a lazily loaded stylesheet at the name the update gave it", (done) => {
	import("./lazy.css")
		.then(() => {
			const [link] = stylesheets();
			expect(link.sheet.css).toContain("red");
			NEXT(
				require("../../update")(done, true, () => {
					// The update swapped the stylesheet for one holding the new content, at
					// the name that content has now.
					const active = stylesheets().filter((l) => !l.sheet.disabled);
					expect(active).toHaveLength(1);
					expect(active[0].href.split("?")[0]).not.toBe(link.href);
					expect(active[0].sheet.css).toContain("blue");
					done();
				})
			);
		})
		.catch(done);
});

module.hot.accept();
