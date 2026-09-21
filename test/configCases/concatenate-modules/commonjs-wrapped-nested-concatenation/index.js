// "feature" is wrapped because only a require() reaches it; its dependency is
// a separate concatenation, and must not be pulled forward ahead of the wrapper
import { tag } from "./member";

global.__nestedConcatOrder = (global.__nestedConcatOrder || []).concat("root");

it("should not evaluate a concatenated dependency of a wrapped member early", () => {
	expect(tag).toBe("member");
	expect(global.__nestedConcatOrder).toEqual(["root"]);
});

it("should evaluate it once the wrapped member is required", () => {
	expect(require("./feature").value).toBe("settings:root");
	expect(global.__nestedConcatOrder).toEqual(["root", "config", "feature"]);
	delete global.__nestedConcatOrder;
});
