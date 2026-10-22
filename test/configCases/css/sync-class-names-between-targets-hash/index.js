import * as styles from "./style.module.css";
import * as other from "./other.module.css";
import * as hashed from "./style.module.css?hash";
import * as otherHashed from "./other.module.css?hash";

const current = {
	styles: { ...styles },
	other: { ...other },
	hashed: { ...hashed },
	otherHashed: { ...otherHashed }
};

CLASS_NAMES[CONFIG_NAME] = current;

it("should generate short hashed class names by default in production", () => {
	// `[fullhash]` in `localIdentName` is the local ident hash
	// (`localIdentHashSalt` + `output.uniqueName` + relative resource path + local name),
	// not the compilation hash
	for (const key of ["styles", "other", "hashed", "otherHashed"]) {
		expect(current[key].button).toMatch(/^[\w-]{6}$/);
	}
	expect(current.styles.primary).toBe(
		`${current.styles.primary.split(" ")[0]} ${current.styles.button}`
	);
});

it("should generate different class names for the same local name in different files", () => {
	expect(current.styles.button).not.toBe(current.other.button);
	expect(current.hashed.button).not.toBe(current.otherHashed.button);
});

if (CONFIG_NAME === "node") {
	it("should produce identical class names on web and node targets with hash-based localIdentName", () => {
		expect(current).toEqual(CLASS_NAMES.web);
	});
}

if (CONFIG_NAME === "node-other-unique-name") {
	it("should produce different class names when output.uniqueName differs", () => {
		expect(current.styles.button).not.toBe(CLASS_NAMES.web.styles.button);
		expect(current.other.button).not.toBe(CLASS_NAMES.web.other.button);
		expect(current.hashed.button).not.toBe(CLASS_NAMES.web.hashed.button);
	});
}
