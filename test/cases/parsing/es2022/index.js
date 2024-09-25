import { value, add } from "./counter";
import Foo from "./es2022";
import C from "./in";
import { "string name" as alias } from "./name";

it("should compile and run", () => {
	new Foo(add);
	expect(value).toBe(2);
	const c = new C(1);
	expect(C.getX(c)).toBe(1)
	expect(alias).toBe("test")
	expect(Foo.getVar()).toBe(5)
});
