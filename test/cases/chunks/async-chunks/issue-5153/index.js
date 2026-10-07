import x from "./module";

it("issue-5153: should export the same binding", () => {
	return import("./module").then(ns => {
		expect(x).toBe(ns.default);
	});
});
