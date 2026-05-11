import "./index.css";

const findOurLink = () =>
	[...window.document.getElementsByTagName("link")].find(
		(item) =>
			item.rel === "stylesheet" &&
			item.href &&
			item.href.includes("bundle.css")
	);

it("should run linkInsert source on HMR and reuse the existing link's parent", (done) => {
	const initial = findOurLink();
	expect(initial).toBeDefined();
	expect(initial.sheet.cssRules[0].style.color.trim()).toBe("red");

	// Move the initial link out of <head> and into <body>. The HMR
	// replacement must land in the same parent (document.body) via
	// hmr.parentNode.insertBefore, regardless of the default <head>.
	window.document.body.appendChild(initial);
	expect(initial.parentNode).toBe(window.document.body);

	NEXT(
		require("../../update")(done, true, () => {
			const taggedLink = [
				...window.document.getElementsByTagName("link")
			].find((l) => l.getAttribute("data-link-insert") === "custom");
			expect(taggedLink).toBeDefined();
			// linkInsert source ran for HMR and placement followed hmr.parentNode.
			expect(taggedLink.parentNode).toBe(window.document.body);
			done();
		})
	);
});
