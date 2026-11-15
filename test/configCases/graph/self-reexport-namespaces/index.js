import * as all from "./self.js";

it("should resolve nested namespaces of a self re-exporting module", () => {
	expect(all.value).toBe(42);
	expect(all.n0.value).toBe(42);
	expect(all.n0.n1.n2.n3.n4.n5.n6.n7.n8.n9.n10.value).toBe(42);
	expect(all.n10.n9.n8.n7.n6.n5.n4.n3.n2.n1.n0.value).toBe(42);
});
