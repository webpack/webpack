import html from "./page.html";

const headOf = (text) => /<head[^>]*>([\s\S]*?)<\/head>/i.exec(text)[1];
// Only the scripts this page authored carry a `type`. The runtime appends its
// own `<script src>` for a hot-update chunk and removes it once the chunk has
// run, so whether that one is still in the head here is a race the assertion
// must not depend on — and leaving it alone is what the patcher promises.
const scriptTypes = () =>
	document.head.children
		.filter((element) => element.nodeName === "SCRIPT")
		.map((element) => element.getAttribute("type"))
		.filter((type) => type !== undefined && type !== null);

it("should patch a removed <script> that never ran and reload for the rest", (done) => {
	document.head.innerHTML = headOf(html);
	// Stand in for the runtime's own hot-update loader, which lands in the head
	// and carries no `type`. It is in neither authored head, so the delta must
	// leave it alone — and pinning one here keeps the assertions below from
	// depending on whether the real one has been cleaned up yet.
	const injected = document.createElement("script");
	document.head.appendChild(injected);
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
			expect(document.head.children).toContain(injected);

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
