import sheetObject from "./sheet-sheet.css";
import "./sheet-style.css";

/**
 * What the `style` export type injected. This target has no document, so the
 * universal runtime collects the stylesheet on globalThis instead.
 * @returns {string} the collected stylesheets
 */
function collectedStyles() {
	const key = Object.keys(globalThis).find((name) =>
		name.startsWith("__webpack_css__")
	);

	return Object.values(globalThis[key]).join("\n");
}

it("minifies a stylesheet javascript imports as a constructable stylesheet", () => {
	expect(sheetObject.cssText).toMatchSnapshot();
});

it("minifies a stylesheet the style export type injects", () => {
	expect(collectedStyles()).toMatchSnapshot();
});
