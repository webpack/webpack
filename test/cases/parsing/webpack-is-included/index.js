import "./module1";
import {
	isWebpackIncludedFunction,
	used,
	unused
} from "./module2";

it("__webpack_is_included__ should be a function", () => {
	expect(isWebpackIncludedFunction).toBe(true);
});

it("__webpack_is_included__ should be true for bundled modules, otherwise false", () => {
	expect(used).toBe(true);
	expect(unused).toBe(false);
});
