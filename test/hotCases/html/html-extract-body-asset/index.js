import html from "./page.html";

it("should DOM-patch a body <script src> chunk URL on hot update of an extracted HTML module", (done) => {
	// Simulate the browser having rendered the extracted .html page.
	const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
	const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
	document.body.innerHTML = bodyMatch[1];
	document.title = titleMatch[1];

	// `<script src="./external.js">` was rewritten to a resolved chunk URL —
	// the original relative request and the build-time chunk-URL sentinel are
	// both gone by the time the HTML reaches the runtime.
	expect(html).not.toContain("./external.js");
	expect(html).not.toContain("__WEBPACK_HTML_CHUNK_URL__");
	expect(html).toMatch(/<script src="[^"]+\.js"><\/script>/);

	NEXT(
		require("../../update")(done, true, () => {
			// The DOM-patch branch swapped in the v2 body; its script URL is
			// still a resolved chunk URL with no unresolved sentinel.
			expect(document.body.innerHTML).toContain("version 2");
			expect(document.body.innerHTML).not.toContain("version 1");
			expect(document.body.innerHTML).not.toContain("__WEBPACK_HTML_CHUNK_URL__");
			expect(document.body.innerHTML).toMatch(
				/<script src="[^"]+\.js"><\/script>/
			);
			// Body/title-only change DOM-patches in place — no full reload.
			expect(window.location.__reloadCount__ || 0).toBe(0);
			done();
		})
	);
});
