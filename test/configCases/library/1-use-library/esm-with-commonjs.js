import d from "library";
import { a, b, external, MyClass1, MyClass2, func1, func2 } from "library";
import * as imoprtStar from "library";

it(
	"should be able to import harmony exports from library (" + NAME + ")",
	function () {
		expect(d).toBe("default-value");
		expect(a).toBe("a");
		expect(b).toBe("b");
		expect(new MyClass1().getNumber()).toBe(1);
		expect(new MyClass2().getNumber()).toBe(2);
		expect(func1()).toBe(3);
		expect(func2()).toBe(4);
		if (typeof TEST_EXTERNAL !== "undefined" && TEST_EXTERNAL) {
			expect(external).toEqual(["external"]);
			expect(external).toBe(require("external"));
			const { externalA } = imoprtStar
			expect(externalA).toEqual(["external-a"]);
		} else {
			expect(external).toBe("non-external");
			const { nonExternalA } = imoprtStar;
			expect(nonExternalA).toBe("non-external-a");
		}
	}
);
