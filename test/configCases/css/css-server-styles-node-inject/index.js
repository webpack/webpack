import "./style.css";

it("collects injected styles on a target without a document", () => {
	expect(__webpack_css_server_styles__).toContain("max-width: 40rem");
});
