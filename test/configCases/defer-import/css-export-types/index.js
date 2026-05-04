// `import defer` coverage for every CSS module exportType webpack supports
// that has a meaningful JS `default`:
//
//   - exportType: "text"             — default is the CSS source string
//   - exportType: "css-style-sheet"  — default is a CSSStyleSheet instance
//   - `with { type: "css" }`         — routes to exportType "css-style-sheet"
//                                      via the default rule in
//                                      lib/config/defaults.js
//
// (`exportType: "link"` and `exportType: "style"` don't expose a useful JS
// `default` — they only side-effect the document — so there's nothing
// observable to defer there.)
//
// Each CSS module is imported through a JS wrapper that calls `touch()` from
// `side-effect-counter.cjs` at top-level. The TC39 import-defer proposal
// requires that evaluation of a deferred module be delayed until the first
// observable access on its namespace; we verify that directly here:
//
//     reset();                  // counter back to 0
//     assertUntouched();        // wrapper not yet evaluated
//     wrapped.default;          // first access — must trigger eval
//     assertTouched();          // wrapper ran exactly once

import defer * as wrappedText from "./wrapper-text.js";
import defer * as wrappedStylesheet from "./wrapper-stylesheet.js";
import defer * as wrappedAttr from "./wrapper-attr.js";

import {
	assertTouched,
	assertUntouched,
	reset
} from "./side-effect-counter.cjs";

function assertIsNamespaceObject(ns) {
	if (typeof ns !== "object" || ns === null) {
		throw new TypeError("namespace is not an object");
	}
	if (!ns[Symbol.toStringTag]) {
		throw new Error(
			"namespace object does not have a Symbol.toStringTag property"
		);
	}
}

it("should defer CSS exportType: 'text' (static `import defer`)", () => {
	reset();
	assertIsNamespaceObject(wrappedText);
	// Per the TC39 spec, just constructing/holding the deferred namespace must
	// not evaluate the module.
	assertUntouched();

	const value = wrappedText.default;
	assertTouched();

	expect(typeof value).toBe("string");
	expect(value).toContain(".defer-text-class");
	expect(value).toContain("rebeccapurple");

	// Subsequent accesses must not re-evaluate the wrapper.
	reset();
	expect(wrappedText.default).toBe(value);
	assertUntouched();
});

it("should defer CSS exportType: 'css-style-sheet' (static `import defer`)", () => {
	reset();
	assertIsNamespaceObject(wrappedStylesheet);
	assertUntouched();

	const sheet = wrappedStylesheet.default;
	assertTouched();

	expect(sheet).toBeInstanceOf(CSSStyleSheet);
	expect(sheet.cssRules.length).toBeGreaterThan(0);
	const rules = Array.from(sheet.cssRules);
	const rule = rules.find(
		r => r.selectorText && r.selectorText.includes("defer-stylesheet-class")
	);
	expect(rule).toBeDefined();
	expect(rule.style.color).toBe("tomato");

	// Subsequent accesses must not re-evaluate the wrapper.
	reset();
	expect(wrappedStylesheet.default).toBe(sheet);
	assertUntouched();
});

it("should defer CSS imported with `{ type: 'css' }` (static `import defer`)", () => {
	reset();
	assertIsNamespaceObject(wrappedAttr);
	assertUntouched();

	const sheet = wrappedAttr.default;
	assertTouched();

	// `with { type: "css" }` is routed to exportType "css-style-sheet" by the
	// default rules in lib/config/defaults.js — Node.js's TC39 stage-3
	// import-attributes-for-css proposal expects the same shape.
	expect(sheet).toBeInstanceOf(CSSStyleSheet);
	const rules = Array.from(sheet.cssRules);
	const rule = rules.find(
		r => r.selectorText && r.selectorText.includes("defer-attr-class")
	);
	expect(rule).toBeDefined();
	expect(rule.style.color).toBe("seagreen");
});

it("should defer CSS exportType: 'text' (dynamic `import.defer`)", async () => {
	reset();
	// `webpackMode: "eager"` keeps the wrapper inlined in the main bundle —
	// the test harness doesn't run a chunk loader for `target: "web"`, but
	// the deferral guarantee is purely about evaluation timing, not chunk
	// fetching, so the assertion is unchanged.
	const dyn = await import.defer(
		/* webpackMode: "eager" */ "./wrapper-dyn-text.js"
	);
	// Per the TC39 spec, awaiting `import.defer` resolves the module's
	// dependencies but must not evaluate the module itself.
	assertIsNamespaceObject(dyn);
	assertUntouched();

	const value = dyn.default;
	assertTouched();

	expect(typeof value).toBe("string");
	expect(value).toContain(".defer-text-class");
});

it("should defer CSS exportType: 'css-style-sheet' (dynamic `import.defer`)", async () => {
	reset();
	const dyn = await import.defer(
		/* webpackMode: "eager" */ "./wrapper-dyn-stylesheet.js"
	);
	assertIsNamespaceObject(dyn);
	assertUntouched();

	const sheet = dyn.default;
	assertTouched();

	expect(sheet).toBeInstanceOf(CSSStyleSheet);
	const rules = Array.from(sheet.cssRules);
	expect(
		rules.some(
			r => r.selectorText && r.selectorText.includes("defer-stylesheet-class")
		)
	).toBe(true);
});
