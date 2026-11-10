import * as root from "./m0.js";

it("should resolve namespaces of mutually re-exporting modules", () => {
	expect(root.value).toBe("m0");
	expect(root.m1.value).toBe("m1");
	expect(root.m2.m3.value).toBe("m3");
	expect(root.m11.m10.value).toBe("m10");
});
