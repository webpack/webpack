import sheetObject from "./sheet-sheet.css";
import "./sheet-style.css";

it("hands every export type that embeds a stylesheet the minified text", () => {
	// A constructable stylesheet where one exists, the text-carrying fallback
	// otherwise — never null, which `typeof` alone would accept.
	expect(typeof sheetObject.replaceSync).toBe("function");

	const cssText =
		typeof CSSStyleSheet !== "undefined" && sheetObject instanceof CSSStyleSheet
			? [...sheetObject.cssRules].map((rule) => rule.cssText).join("")
			: sheetObject.cssText;

	expect(cssText).toContain(".sheet_sheet_css{color:red;margin:10px}");
	// And every payload it nests is minified too, whichever export type carries
	// the sheet.
	expect(cssText).toContain("@import url(data:text/css,.imported{color:red})");
	expect(cssText).toContain("<svg> <rect fill='red' /> </svg>");
	expect(cssText).not.toContain("dropped");
});
