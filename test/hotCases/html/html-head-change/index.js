import html from "./page.html";

const headOf = (text) => /<head[^>]*>([\s\S]*?)<\/head>/i.exec(text)[1];

it("should patch the HTML <head> in place when it changes beyond <title>", (done) => {
	// Simulate the browser having rendered the extracted .html page, plus the
	// stylesheet link webpack injects into the head on load — the shim must
	// leave that one alone while it reconciles the authored elements.
	document.head.innerHTML = headOf(html);
	const injected = document.createElement("link");
	injected.rel = "stylesheet";
	document.head.appendChild(injected);
	const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
	document.body.innerHTML = bodyMatch[1];
	expect(window.location.__reloadCount__ || 0).toBe(0);
	expect(
		document.head.children.filter((el) => el.nodeName === "META")
	).toHaveLength(1);

	NEXT(
		require("../../update")(done, true, () => {
			// The new HTML kept `<title>` identical but flipped a `<meta>`
			// attribute. Only that element is replaced — no reload, and the
			// stylesheet link webpack put in the head is still there.
			expect(window.location.__reloadCount__ || 0).toBe(0);
			const metaElements = document.head.children.filter(
				(el) => el.nodeName === "META"
			);
			expect(metaElements).toHaveLength(1);
			expect(metaElements[0].outerHTML).toContain('content="v2"');
			expect(document.head.children).toContain(injected);
			// Body patching runs as usual once the head reconciles.
			expect(document.body.innerHTML).toContain("head test");
			done();
		})
	);
});
