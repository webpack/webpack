import html from "./page.html";

const headOf = (text) => /<head[^>]*>([\s\S]*?)<\/head>/i.exec(text)[1];
const scriptTypes = () =>
	document.head.children
		.filter((element) => element.nodeName === "SCRIPT")
		.map((element) => element.getAttribute("type"));

it("should patch a removed <script> that never ran and reload for the rest", (done) => {
	document.head.innerHTML = headOf(html);
	expect(window.location.__reloadCount__ || 0).toBe(0);
	expect(scriptTypes()).toEqual([
		"application/ld+json",
		"importmap",
		"speculationrules"
	]);

	NEXT(
		require("../../update")(done, true, () => {
			// `application/ld+json` is a data block: the browser never executed it,
			// so dropping it is as safe as dropping a `<meta>`.
			expect(window.location.__reloadCount__ || 0).toBe(0);
			expect(scriptTypes()).toEqual(["importmap", "speculationrules"]);

			NEXT(
				require("../../update")(done, true, () => {
					// An import map that has been applied cannot be un-applied.
					expect(window.location.__reloadCount__).toBe(1);

					NEXT(
						require("../../update")(done, true, () => {
							expect(window.location.__reloadCount__).toBe(2);
							done();
						})
					);
				})
			);
		})
	);
});
