// no CSS import: the module variable is the only thing pulling in runtime
it("works when the collected styles are the only runtime consumer", () => {
	expect(__webpack_css_server_styles__).toBe("");
});
