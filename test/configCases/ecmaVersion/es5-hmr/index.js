import { value } from "./dependency";

if (module.hot) {
	module.hot.accept("./dependency", function () {});
}

it("should carry the hot runtime without leaving es5", function () {
	expect(value).toBe(42);
	expect(typeof module.hot.accept).toBe("function");
});
