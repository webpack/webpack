import { A, B } from "./module";
import { A as A1, B as B1 } from "./module?1";

it("should not rename class properties", function () {
	expect(A.staticProp).toBe("value");
	expect(B.staticProp).toBe("value");
	expect(A1.staticProp).toBe("value");
	expect(B1.staticProp).toBe("value");
	expect(A.value).toBe("value");
	expect(B.value).toBe("value");
	expect(A1.value).toBe("value");
	expect(B1.value).toBe("value");
	expect(new A().prop).toBe("value");
	expect(new B().prop).toBe("value");
	expect(new A1().prop).toBe("value");
	expect(new B1().prop).toBe("value");
	expect(new A().value).toBe("value");
	expect(new B().value).toBe("value");
	expect(new A1().value).toBe("value");
	expect(new B1().value).toBe("value");
});
