import * as style from "./style.module.css";
import "./no-scoping.module.css";
import "./global.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

/**
 * The single ident an at-rule prelude names, e.g. `@keyframes <name>`.
 * @param {RegExp} re pattern whose first group captures the prelude ident
 * @returns {string} the captured ident
 */
const preludeName = (re) => {
	const match = re.exec(css);
	expect(match).not.toBe(null);
	return match[1];
};

/**
 * The value of a declaration in the rule holding the given (scoped) class.
 * @param {string} className unscoped class name
 * @param {string} property declaration property name
 * @returns {string} the declaration value
 */
const declarationValue = (className, property) => {
	// The scoped ident always ends in `_css-<class>`, so anchoring on that
	// separator keeps `anim` from matching `prefixed-anim` and friends.
	const rule = new RegExp(
		`\\.[^\\s{}]*_css-${className}\\s*\\{[^}]*?${property}:\\s*([^;\\n]+)`
	).exec(css);
	expect(rule).not.toBe(null);
	return rule[1].trim();
};

/**
 * The declaration block of the rule holding the given (scoped) class.
 * @param {string} className unscoped class name
 * @returns {string} everything between the rule's braces
 */
const ruleBody = (className) => {
	const rule = new RegExp(
		`\\.[^\\s{}]*_css-${className}\\s*\\{([^}]*)\\}`
	).exec(css);
	expect(rule).not.toBe(null);
	return rule[1];
};

/**
 * How many times a substring occurs in another.
 * @param {string} haystack string to search
 * @param {string} needle substring to count
 * @returns {number} occurrence count
 */
const countOf = (haystack, needle) => haystack.split(needle).length - 1;

it("should emit the whole stylesheet with every prelude ident replaced once", () => {
	expect(css).toMatchSnapshot();
});

it("should give @keyframes and its animation references the same @value-derived name", () => {
	const name = preludeName(/@keyframes ([^\s{]+) \{\s+from \{ opacity: 0; \}\s+to \{/);
	expect(name).toBe("value-at-rule-prelude-style_module_css-pulseAnim");
	expect(declarationValue("anim", "animation")).toBe(`${name} 2s linear`);
	expect(declarationValue("anim", "animation-name")).toBe(name);
});

it("should not concatenate the @value name onto its own substituted value", () => {
	expect(css).not.toMatch(/pulseAnimpulseAnim/);
	expect(css).not.toMatch(/spinAnimspinAnim/);
	expect(css).not.toMatch(/fadeAnimfadeAnim/);
	expect(css).not.toMatch(/romanCounterromanCounter/);
	expect(css).not.toMatch(/sidebarContainersidebarContainer/);
	expect(css).not.toMatch(/scopeRootClsscopeRootCls/);
	expect(css).not.toMatch(/scopeAttrClsscopeAttrCls/);
	expect(css).not.toMatch(/articlearticle/);
	expect(css).not.toMatch(/chainedAnimchainedAnim/);
	expect(css).not.toMatch(/importedAnimimportedAnim/);
});

it("should substitute every occurrence of a repeated @value animation name", () => {
	const pulse = "value-at-rule-prelude-style_module_css-pulseAnim";
	const spin = "value-at-rule-prelude-style_module_css-spinAnim";

	// An overriding second declaration is substituted like the first.
	const override = ruleBody("override-anim");
	expect(countOf(override, pulse)).toBe(2);
	expect(override).toContain(`animation: ${pulse} 1s linear;`);
	expect(override).toContain(`animation: ${pulse} 2s linear;`);

	// Comma-separated lists substitute per entry, repeats included.
	expect(ruleBody("multi-anim")).toContain(`animation-name: ${pulse}, ${spin};`);
	expect(ruleBody("repeat-anim")).toContain(
		`animation-name: ${pulse}, ${pulse};`
	);
	expect(ruleBody("shorthand-list-anim")).toContain(
		`animation: ${pulse} 1s, ${spin} 2s;`
	);

	// Two @keyframes blocks may name the same @value; both preludes replace.
	expect(countOf(css, `@keyframes ${pulse} {`)).toBe(2);
});

it("should scope a vendor-prefixed @keyframes named by a @value", () => {
	const name = preludeName(/@-webkit-keyframes ([^\s{]+)/);
	expect(name).toBe("value-at-rule-prelude-style_module_css-spinAnim");
	expect(declarationValue("prefixed-anim", "-webkit-animation-name")).toBe(name);
});

it("should scope a @value named by an explicit local() in the prelude", () => {
	const name = preludeName(/@keyframes ([^\s{]*fadeAnim)/);
	expect(name).toBe("value-at-rule-prelude-style_module_css-fadeAnim");
	expect(declarationValue("local-anim", "animation-name")).toBe(name);
});

it("should substitute but not scope a @value named by global() in the prelude", () => {
	expect(css).toMatch(/@keyframes sharedAnim \{/);
});

it("should resolve a chained @value used as a @keyframes name", () => {
	const name = preludeName(/@keyframes ([^\s{]*chainedAnim)/);
	expect(name).toBe("value-at-rule-prelude-style_module_css-chainedAnim");
	expect(declarationValue("chained-anim", "animation-name")).toBe(name);
});

it("should resolve an imported @value used as a @keyframes name", () => {
	const name = preludeName(/@keyframes ([^\s{]*importedAnim)/);
	expect(name).toBe("importedAnim");
	expect(declarationValue("imported-anim", "animation-name")).toBe(name);
});

it("should give @counter-style and its list-style references the same name", () => {
	const name = preludeName(/@counter-style ([^\s{]+) \{\s+system: cyclic;\s+symbols: "\*"/);
	expect(name).toBe("value-at-rule-prelude-style_module_css-romanCounter");
	expect(declarationValue("counter", "list-style")).toBe(name);

	const importedName = preludeName(
		/@counter-style ([^\s{]+) \{\s+system: cyclic;\s+symbols: "\+"/
	);
	expect(declarationValue("imported-counter", "list-style")).toBe(importedName);
});

it("should scope a @container name from a @value and still substitute its condition", () => {
	const match = /@container ([^\s{]+) \(min-width: ([^)]+)\)/.exec(css);
	expect(match).not.toBe(null);
	expect(match[1]).toBe("value-at-rule-prelude-style_module_css-sidebarContainer");
	expect(match[2]).toBe("400px");
	expect(declarationValue("container", "container-name")).toBe(match[1]);
});

it("should replace @scope prelude idents once", () => {
	const match = /@scope \(\.([^\s)]+)\) to \(([^\s)]+)\)/.exec(css);
	expect(match).not.toBe(null);
	expect(match[1]).toBe("value-at-rule-prelude-style_module_css-scopeRootCls");
	expect(match[2]).toBe("article");

	const attrMatch = /@scope \(\[class=([^\]]+)\]\)/.exec(css);
	expect(attrMatch).not.toBe(null);
	expect(attrMatch[1]).toBe(
		"value-at-rule-prelude-style_module_css-scopeAttrCls"
	);
});

it("should keep substituting a @value used as a whole @media query", () => {
	expect(css).toMatch(/@media \(max-width: 599px\) \{/);
});

it("should substitute a @value prelude name once when scoping is off for the at-rule", () => {
	expect(css).toMatch(/@keyframes unscopedPulse \{/);
	expect(css).toMatch(/@counter-style unscopedCounter \{/);
	expect(css).toMatch(/@container unscopedContainer \(min-width: 400px\) \{/);
	expect(declarationValue("no-scoping-anim", "animation")).toBe(
		"unscopedPulse 2s linear"
	);
	expect(declarationValue("no-scoping-anim", "list-style")).toBe(
		"unscopedCounter"
	);
	expect(declarationValue("no-scoping-anim", "container-name")).toBe(
		"unscopedContainer"
	);
});

it("should substitute a @value prelude name once in global mode", () => {
	expect(css).toMatch(/@keyframes globalPulse \{/);
	expect(css).toMatch(/@counter-style globalCounter \{/);
	expect(css).toMatch(/\.global-anim \{[^}]*color: rebeccapurple;/);
	expect(css).toMatch(/\.global-anim \{[^}]*--animation-name: globalPulse;/);
});

it("should still export the classes of the stylesheet", () => {
	expect(style.anim).toMatch(/-anim$/);
	expect(style["in-container"]).toMatch(/-in-container$/);
	expect(style["in-scope"]).toMatch(/-in-scope$/);
	expect(style["in-media"]).toMatch(/-in-media$/);
});
