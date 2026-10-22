import { fn } from "./root";
import(/* webpackMode: "eager" */ "./external");

it("issue-10308: should use the correct names", () => {
	expect(fn()).toBe(42);
});
