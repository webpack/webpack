import * as root from "./m0.js";

it("should resolve namespaces of mutually re-exporting modules", () => {
	expect(root.value).toBe("m0");
	expect(root.m1.value).toBe("m1");
	expect(root.m10.m9.m8.m7.m6.m5.m4.m3.m2.m1.value).toBe("m1");
	expect(root.m2.m3.value).toBe("m3");
});
