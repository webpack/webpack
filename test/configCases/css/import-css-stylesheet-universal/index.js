import sheet from "./style.css" with { type: "css" };

const isBrowser = typeof window !== "undefined";

it("imports CSS as a constructable stylesheet on web", () => {
	if (!isBrowser) return;
	expect(sheet).toBeInstanceOf(CSSStyleSheet);
	expect(typeof sheet.replaceSync).toBe("function");
});

it("falls back to a text-carrying object on node (no CSSStyleSheet)", () => {
	if (isBrowser) return;
	// SSR-friendly fallback: expose the merged css text instead of crashing
	expect(typeof sheet.cssText).toBe("string");
	expect(sheet.cssText).toContain(".test");
	expect(sheet.cssText).toContain("red");
	expect(typeof sheet.replaceSync).toBe("function");
	// `this` must bind to the fallback object (regular function, not arrow)
	sheet.replaceSync(".replaced {}");
	expect(sheet.cssText).toBe(".replaced {}");
});
