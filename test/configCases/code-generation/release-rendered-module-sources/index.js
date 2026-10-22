import { value } from "./dep";

it("should render a working bundle after releasing the rendered sources", () => {
	expect(value()).toBe(42);
});
