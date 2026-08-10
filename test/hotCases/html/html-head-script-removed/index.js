import html from "./page.html";

const headOf = (text) => /<head[^>]*>([\s\S]*?)<\/head>/i.exec(text)[1];

it("should reload when a <script> leaves the <head>", (done) => {
	document.head.innerHTML = headOf(html);
	expect(window.location.__reloadCount__ || 0).toBe(0);

	NEXT(
		require("../../update")(done, true, () => {
			// A script that has run cannot be un-run, so dropping one is the one
			// head edit still worth a reload.
			expect(window.location.__reloadCount__).toBe(1);
			done();
		})
	);
});
