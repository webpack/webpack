// "consumer" is wrapped because only a require() reaches it; its own dependency
// cannot be wrapped, and must not be pulled forward ahead of the wrapper
import { tag } from "./member";

const ORDER_AT_LOAD = (global.__unwrappableOrder || []).slice();

it("should not evaluate an unwrappable dependency of a wrapped member early", () => {
	expect(tag).toBe("member");
	expect(ORDER_AT_LOAD).not.toContain("dep");
});

it("should evaluate it once the wrapped member is required", () => {
	expect(require("./consumer").value).toBe("dep");
	expect(global.__unwrappableOrder).toContain("dep");
	delete global.__unwrappableOrder;
});
