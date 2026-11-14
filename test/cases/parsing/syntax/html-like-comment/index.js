import { less, text, left } from "./module.js";

it("html-like-comment: should keep a module's `<!--` as operators", () => {
	expect(less).toBe(false);
	expect(text).toBe(false);
	expect(left()).toBe(0);
});

it("html-like-comment: should read `<!--` in a script as a comment", () => {
	expect(require("./script.js")).toBe(1);
});
