import textCss from "./style.css";

it("should embed an inline source map for the CSS exported as text", () => {
	// The exported text contains the CSS body together with a trailing
	// `/*# sourceMappingURL=data:application/json;base64,... */` comment that
	// DevTools (and anything that re-injects this CSS into a <style> tag)
	// uses to map back to the original CSS source.
	expect(textCss).toContain(".text-class");
	expect(textCss).toContain("color: red");

	const match = textCss.match(
		/sourceMappingURL=data:application\/json(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/=]+)/
	);
	expect(match).not.toBeNull();

	const map = JSON.parse(Buffer.from(match[1], "base64").toString("utf-8"));
	expect(map.version).toBe(3);
	expect(typeof map.mappings).toBe("string");
	expect(map.mappings.length).toBeGreaterThan(0);

	const cssSourceIndex = map.sources.findIndex((s) => s.includes("style.css"));
	expect(cssSourceIndex).toBeGreaterThanOrEqual(0);
	expect(map.sourcesContent[cssSourceIndex]).toContain(".text-class");
});
