import * as styles from "./style.module.css";

it("should parse composes with mixed local() and global() functions per-class", () => {
	const localClassName = styles["local-class-name"];
	const otherLocalClass = styles["other-local-class"];

	// local-class-name and other-local-class are local — should be prefixed
	expect(localClassName).not.toBe("local-class-name");
	expect(localClassName).toContain("local-class-name");
	expect(otherLocalClass).not.toBe("other-local-class");
	expect(otherLocalClass).toContain("other-local-class");

	// `composes: local-class-name global(global-class-name) local(other-local-class)`
	// — first is local (default), second is global, third is local (explicit)
	const mixed = styles["mixed-composes"].split(" ");
	expect(mixed).toContain(localClassName);
	expect(mixed).toContain("global-class-name");
	expect(mixed).toContain(otherLocalClass);
	// global-class-name must NOT be prefixed
	expect(mixed).not.toContain(`${otherLocalClass.replace(/other-local-class$/, "")}global-class-name`);

	// `composes: global(global-class-name) local-class-name`
	const globalThenLocal = styles["global-then-local"].split(" ");
	expect(globalThenLocal).toContain("global-class-name");
	expect(globalThenLocal).toContain(localClassName);

	// `composes: local-class-name global(global-class-name)`
	const localThenGlobal = styles["local-then-global"].split(" ");
	expect(localThenGlobal).toContain(localClassName);
	expect(localThenGlobal).toContain("global-class-name");
});
