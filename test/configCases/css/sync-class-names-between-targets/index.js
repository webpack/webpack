import * as styles from "./style.module.css";

it("should produce identical class names on web and node targets when localIdentName is path-based (no getJSON sync needed)", () => {
	// `[file]__[local]` resolves to the same string on every target,
	// so SSR and client hydrate with identical class names without
	// needing css-loader's getJSON option to round-trip.
	expect(styles.button).toBe("./style.module.css__button");
	expect(styles.primary).toBe(
		"./style.module.css__primary ./style.module.css__button"
	);
	expect(styles.PascalCase).toBe("./style.module.css__PascalCase");
	expect(styles["with-dashes"]).toBe("./style.module.css__with-dashes");
});
