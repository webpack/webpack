import html from "./page.html";

const headOf = (text) => /<head[^>]*>([\s\S]*?)<\/head>/i.exec(text)[1];

it("should re-create a <script> added to the <head> rather than reload", (done) => {
	document.head.innerHTML = headOf(html);
	expect(window.location.__reloadCount__ || 0).toBe(0);
	expect(window.__headScript__).toBeUndefined();

	NEXT(
		require("../../update")(done, true, () => {
			// The element parsed out of the new head carries the already-started
			// flag, so the shim inserts a fresh one built from its attributes and
			// body. Only that one runs — which is what the reload it replaces did.
			expect(window.location.__reloadCount__ || 0).toBe(0);
			const added = document.head.children.filter(
				(element) => element.getAttribute("data-added") === "yes"
			);
			expect(added).toHaveLength(1);
			expect(added[0].nodeName).toBe("SCRIPT");
			// Attaching a script with a `src` runs it, one tick later.
			setTimeout(() => {
				expect(window.__headScript__).toBe(1);
				done();
			}, 0);
		})
	);
});
