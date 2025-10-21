import MyClass, {a, b} from "library-commonjs";

it("should get exports from systemjs library (" + NAME + ")", function() {
	expect(new MyClass().getValue()).toBe("my-class")
	expect(a).toBe(10);
	expect(b).toBe(20);
});
