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
