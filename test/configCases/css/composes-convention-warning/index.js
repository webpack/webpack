import * as styles from "./style.modules.css";

it("composes against a dashed local class resolves under camel-case-only", () => {
	// Only camelCased names are exported under `camel-case-only`.
	expect(styles.fooBar).toBeDefined();
	expect(styles.baz).toBeDefined();
	expect(styles.qux).toBeDefined();
	expect(styles).not.toHaveProperty("foo-bar");
	expect(styles).not.toHaveProperty("dashy-thing");

	// `baz` composes `foo-bar` (same module) — the conventioned class id must
	// be appended to baz's value.
	const bazClasses = styles.baz.split(" ");
	const fooBarClasses = styles.fooBar.split(" ");
	for (const c of fooBarClasses) {
		expect(bazClasses).toContain(c);
	}

	// `qux` composes `dashy-thing` from another module — that module's class
	// id must be present too.
	expect(styles.qux.split(" ").length).toBeGreaterThanOrEqual(2);
});
