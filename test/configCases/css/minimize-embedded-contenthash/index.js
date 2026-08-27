import css from "./style.css";

it("should minify the embedded stylesheet", () => {
	// One build converts the length, the other does not; test.config.js compares
	// what each named its bundle.
	expect(css).toMatch(/^\.a\{margin:(?:16px|1pc)\}$/);
});
