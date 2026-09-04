import sheetObject from "./sheet-sheet.css";

it("minifies a stylesheet javascript imports as a constructable stylesheet", () => {
	expect(sheetObject.cssText).toMatchSnapshot();
});
