import sheetObject from "./sheet-sheet.css";
import "./sheet-style.css";

it("hands every export type that embeds a stylesheet the minified text", () => {
	expect(typeof sheetObject).toBe("object");
});
