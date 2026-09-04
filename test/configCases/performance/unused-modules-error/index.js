// eslint-disable-next-line no-unused-vars
import { helper } from "./tracker";
import "./pure";
import { value } from "./read";

it("should report the unused module as an error", () => {
	// `read.js` has a side effect too, but something reads its export, so it is
	// not bundled for nothing.
	expect(value).toBe(42);
	expect(global.__ANALYTICS__.started).toBe(true);
});
