import { value, add } from "./counter";
import Foo from "./es2022";

it("should compile and run", () => {
	new Foo(add);
	expect(value).toBe(2);
});
