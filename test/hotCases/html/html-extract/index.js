import html from "./page.html";

it("should DOM-patch document.body and document.title on hot update of an extracted HTML module", (done) => {
	// Initial: simulate the browser having rendered the extracted .html
	// page. The HMR shim's DOM-patch branch is guarded behind
	// `module.hot.data`, so it does NOT run on the first evaluation —
	// document.body and document.title stay whatever the test sets here.
	const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
	const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
	document.body.innerHTML = bodyMatch[1];
	document.title = titleMatch[1];
	expect(document.title).toBe("version 1");
	expect(document.body.innerHTML).toContain("version 1");

	NEXT(
		require("../../update")(done, true, () => {
			// After the hot update, the shim's dispose handler ran on the
			// previous instance, so `module.hot.data` is set on this
			// evaluation and the DOM-patch branch swaps in the new body /
			// title without anyone calling into the importer.
			expect(document.title).toBe("version 2");
			expect(document.body.innerHTML).toContain("version 2");
			expect(document.body.innerHTML).not.toContain("version 1");

			NEXT(
				require("../../update")(done, true, () => {
					expect(document.title).toBe("version 3");
					expect(document.body.innerHTML).toContain("version 3");
					done();
				})
			);
		})
	);
});
