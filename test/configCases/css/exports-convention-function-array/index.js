import * as styles from "./style.module.css";

it("should export both the original and the uppercase form when exportsConvention returns an array", () => {
	expect(styles).toMatchSnapshot();
	// Original-name form
	expect(styles["btn-info_is-disabled"]).toBe(
		"style_module_css-btn-info_is-disabled"
	);
	expect(styles.simple).toBe("style_module_css-simple");
	expect(styles.foo_bar).toBe("style_module_css-foo_bar");
	// Uppercase form returned by the second array entry
	expect(styles["BTN-INFO_IS-DISABLED"]).toBe(
		"style_module_css-btn-info_is-disabled"
	);
	expect(styles.SIMPLE).toBe("style_module_css-simple");
	expect(styles.FOO_BAR).toBe("style_module_css-foo_bar");
});
