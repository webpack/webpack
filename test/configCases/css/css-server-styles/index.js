import "./style.css";

const hasDocument = typeof document !== "undefined";

it("exposes the collected styles as a string", () => {
	expect(typeof __webpack_css_server_styles__).toBe("string");
});

it("returns the styles collected while rendering without a DOM", () => {
	if (hasDocument) {
		// styles went into the document, so nothing was collected for the server
		expect(__webpack_css_server_styles__).toBe("");
	} else {
		expect(__webpack_css_server_styles__).toContain("color: rebeccapurple");
	}
});

it("escapes a closing style tag so the styles stay inside a <style> element", () => {
	if (hasDocument) return;
	expect(__webpack_css_server_styles__).not.toMatch(/<\/style/i);
	expect(__webpack_css_server_styles__).toContain(
		'content: "<\\/style>.x{color:red}"'
	);
});
