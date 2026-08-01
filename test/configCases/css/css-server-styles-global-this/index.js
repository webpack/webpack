import "./style.css";

it("collects the styles on globalThis when the environment supports it", () => {
	if (typeof document !== "undefined") return;

	expect(__webpack_css_server_styles__).toContain("color: darkcyan");
	expect(globalThis["__webpack_css__global-this"]).toBeTruthy();
});
