import * as style from "./style.css";

it("should auto-enable the built-in css support when no loader handles .css", () => {
	// Raw CSS only compiles as a first-class module, not as JavaScript, so a
	// successful build with an object export proves the built-in type is active.
	expect(style).toEqual({});
});
