import * as basic from "./basic.module.css";
import * as styles from "./classes.module.css";
import * as styles1 from "./composes-multiple.module.css";
import * as styles3 from "./composes-global.module.css";
import * as styles4 from "./scope-at-rule.module.css";
import * as styles5 from "./nesting.module.css";
import * as styles6 from "./prefer-relative.module.css";
import * as styles7 from "./animation-name.module.css";
import * as styles8 from "./at-sign-in-package-name.module.css";
import * as styles9 from "./resolving-from-node_modules.module.css";
import * as styles10 from "./local-Ident-name.module.css";
import * as styles11 from "./local-Ident-name.module.css?local-ident-name-1";
import * as styles12 from "./local-Ident-name.module.css?local-ident-name-2";
import * as styles13 from "./local-Ident-name.module.css?local-ident-name-3";
import * as styles14 from "./local-Ident-name.module.css?local-ident-name-4";
import * as styles15 from "./local-Ident-name.module.css?local-ident-name-5";
import * as styles16 from "./local-Ident-name.module.css?local-ident-name-6";
import * as styles17 from "./local-Ident-name.module.css?local-ident-name-7";
import * as styles18 from "./local-Ident-name.module.css?local-ident-name-8";
import * as styles19 from "./local-Ident-name.module.css?local-ident-name-9";
import * as stylesHash10 from "./local-Ident-name.module.css?local-ident-name-10";
import * as stylesHash11 from "./local-Ident-name.module.css?local-ident-name-11";
import * as stylesHash12 from "./local-Ident-name.module.css?local-ident-name-12";
import * as stylesHash13 from "./local-Ident-name.module.css?local-ident-name-13";
import * as stylesHash14 from "./local-Ident-name.module.css?local-ident-name-14";
import * as styles20 from "./order.module.css";
import * as styles21 from "./dedup.module.css";
import * as styles22 from "./composes-from-less.module.css";
import * as styles23 from "./tilde.module.css";
import * as styles24 from "./icss.module.css";
import * as styles25 from "./empty.module.css";
import * as styles26 from "./component-name.module.css";
import * as styles27 from "./composes-chain.module.css";
import * as styles28 from "./file.with.many.dots.in.name.module.css";
import * as styles29 from "./composes-duplicate.module.css";
import * as styles30 from "./keyframes-leak-scope.module.css";
import * as styles31 from "./path-placeholder.module.css";
import * as styles32 from "./at-value-extra.module.css";
import * as styles33 from "./composes-circular.module.css";

const EXPORT_TYPE = process.env.EXPORT_TYPE;

// Read `default` via Reflect.get so webpack's HarmonyImportSpecifier analysis
// does not flag a "missing export 'default'" warning for exportTypes that
// legitimately have no default export (link/style).
const DEFAULT_KEY = "default";
const getDefault = (/** @type {object} */ ns) => Reflect.get(ns, DEFAULT_KEY);

/**
 * Returns the namespace's class name exports without the `default` export.
 * Class name maps should be identical across exportTypes; the `default` export
 * shape varies per exportType and is asserted separately below.
 * @param {object} ns module namespace object
 * @returns {object} exports without `default`
 */
const classes = (ns) => {
	const out = {};
	for (const key of Object.keys(ns)) {
		if (key === "default") continue;
		out[key] = ns[key];
	}
	return out;
};

it(`should export CSS module class names (${EXPORT_TYPE})`, () => {
	expect(classes(basic)).toMatchSnapshot();
	expect(classes(styles)).toMatchSnapshot();
	expect(classes(styles1)).toMatchSnapshot();
	expect(classes(styles3)).toMatchSnapshot();
	expect(classes(styles4)).toMatchSnapshot();
	expect(classes(styles5)).toMatchSnapshot();
	expect(classes(styles6)).toMatchSnapshot();
	expect(classes(styles7)).toMatchSnapshot();
	expect(classes(styles8)).toMatchSnapshot();
	expect(classes(styles9)).toMatchSnapshot();
	expect(classes(styles10)).toMatchSnapshot();
	expect(classes(styles11)).toMatchSnapshot();
	expect(classes(styles12)).toMatchSnapshot();
	expect(classes(styles13)).toMatchSnapshot();
	expect(classes(styles14)).toMatchSnapshot();
	expect(classes(styles15)).toMatchSnapshot();
	expect(classes(styles16)).toMatchSnapshot();
	expect(classes(styles17)).toMatchSnapshot();
	expect(classes(styles18)).toMatchSnapshot();
	expect(classes(styles19)).toMatchSnapshot();
	expect(classes(stylesHash10)).toMatchSnapshot();
	expect(classes(stylesHash11)).toMatchSnapshot();
	expect(classes(stylesHash12)).toMatchSnapshot();
	expect(classes(stylesHash13)).toMatchSnapshot();
	expect(classes(stylesHash14)).toMatchSnapshot();
	expect(classes(styles20)).toMatchSnapshot();
	expect(classes(styles21)).toMatchSnapshot();
	expect(classes(styles22)).toMatchSnapshot();
	expect(classes(styles23)).toMatchSnapshot();
	expect(classes(styles24)).toMatchSnapshot();
	expect(classes(styles25)).toMatchSnapshot();
	expect(classes(styles26)).toMatchSnapshot();
	expect(classes(styles27)).toMatchSnapshot();
	expect(classes(styles28)).toMatchSnapshot();
	expect(classes(styles29)).toMatchSnapshot();
	expect(classes(styles30)).toMatchSnapshot();
	expect(classes(styles31)).toMatchSnapshot();
	expect(classes(styles32)).toMatchSnapshot();
	expect(classes(styles33)).toMatchSnapshot();
});

// Note: assertions about `default` use `basic.module.css` because
// `classes.module.css` defines a class literally named `default`, which
// collides with the module's actual default export.

if (EXPORT_TYPE === "link") {
	it("should load extracted CSS chunk via <link> tag (link)", () => {
		const links = document.getElementsByTagName("link");
		const css = [];

		// Skip first because import it by default
		for (const link of links.slice(1)) {
			css.push(link.sheet.css);
		}

		expect(css).toMatchSnapshot();
	});

	it("should not provide a `default` export for the link exportType", () => {
		expect(Object.keys(basic).includes("default")).toBe(false);
	});

	it("should expose a class literally named `default` (link)", () => {
		// classes.module.css defines `.default { ... }`; verify the named class
		// export is preserved even though the namespace has no default export.
		expect(typeof styles.default).toBe("string");
		expect(styles.default).toContain("default");
	});
}

if (EXPORT_TYPE === "text") {
	it("should export CSS text as the `default` export (text)", () => {
		const basicDefault = getDefault(basic);
		expect(typeof basicDefault).toBe("string");
		expect(basicDefault).toContain("basic_module_css-a");
	});

	it("should not produce a separate CSS chunk for the text exportType", () => {
		const links = document.getElementsByTagName("link");
		// Only the manually-attached <link> from test.config.js (when present) exists;
		// the bundle itself does not emit a CSS chunk.
		expect(links.length).toBeLessThanOrEqual(1);
	});
}

if (EXPORT_TYPE === "css-style-sheet") {
	it("should export a CSSStyleSheet as the `default` export (css-style-sheet)", () => {
		const basicDefault = getDefault(basic);
		expect(basicDefault).toBeInstanceOf(CSSStyleSheet);
		expect(basicDefault.cssRules.length).toBeGreaterThan(0);
	});

	it("should not produce a separate CSS chunk for the css-style-sheet exportType", () => {
		const links = document.getElementsByTagName("link");
		expect(links.length).toBeLessThanOrEqual(1);
	});
}

if (EXPORT_TYPE === "style") {
	it("should inject CSS via <style> tags (style)", () => {
		const styleTags = document.getElementsByTagName("style");
		expect(styleTags.length).toBeGreaterThan(0);

		const allCSS = Array.from(styleTags).map((s) => s.textContent);
		// basic.module.css contributes class `a` -> `basic_module_css-a`
		expect(allCSS.some((c) => c.includes("basic_module_css-a"))).toBe(true);
	});

	it("should not provide a `default` export for the style exportType", () => {
		expect(Object.keys(basic).includes("default")).toBe(false);
	});

	it("should expose a class literally named `default` (style)", () => {
		// classes.module.css defines `.default { ... }`; the named class export
		// must still be available even though there is no real default export.
		expect(typeof styles.default).toBe("string");
		expect(styles.default).toContain("default");
	});

	it("should not produce a separate CSS chunk for the style exportType", () => {
		const links = document.getElementsByTagName("link");
		expect(links.length).toBeLessThanOrEqual(1);
	});
}
