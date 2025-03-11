import d from "library";
import { a, b, external } from "library";
import * as imoprtStar from "library";

it(
	"should be able to import harmony exports from library (" + NAME + ")",
	function () {
		expect(d).toBe("default-value");
		expect(a).toBe("a");
		expect(b).toBe("b");
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
