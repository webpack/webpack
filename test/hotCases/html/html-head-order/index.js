import html from "./page.html";

const headOf = (text) => /<head[^>]*>([\s\S]*?)<\/head>/i.exec(text)[1];
const metaNames = () =>
	document.head.children
		.filter((element) => element.nodeName === "META")
		.map((element) => element.getAttribute("name"));

it("should insert an added <head> element at its authored position", (done) => {
	document.head.innerHTML = headOf(html);
	// The runtime appends its own nodes to the head; they must not be disturbed,
	// and they must not push an authored element out of place either.
	const injected = document.createElement("link");
	injected.rel = "stylesheet";
	document.head.appendChild(injected);
	expect(metaNames()).toEqual(["a", "c"]);

	NEXT(
		require("../../update")(done, true, () => {
			// `b` is authored between `a` and `c`, so appending it at the end would
			// put it after `c` and change the cascade a reload would have produced.
			expect(window.location.__reloadCount__ || 0).toBe(0);
			expect(metaNames()).toEqual(["a", "b", "c"]);
			expect(document.head.children).toContain(injected);
			done();
		})
	);
});
