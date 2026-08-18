import "./polyfill";
import { one } from "./barrel";

it("should warn only about the re-exported modules nothing uses", () => {
	expect(one).toBe("one");
	expect(global.__polyfilled).toBe(true);
});
