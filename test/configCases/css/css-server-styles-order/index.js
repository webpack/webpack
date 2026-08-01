import "./first.css";
import "./second.css";

it("concatenates the styles in the order they were applied", () => {
	if (typeof document !== "undefined") return;

	const css = __webpack_css_server_styles__;

	// last one applied wins the cascade, so it has to come last
	expect(css.indexOf("color: red")).toBeLessThan(css.indexOf("color: green"));
});
