import "./polyfill";
import { one } from "./barrel";

it("should report them as an error", () => {
	expect(one).toBe("one");
	expect(global.__polyfilled).toBe(true);
});
