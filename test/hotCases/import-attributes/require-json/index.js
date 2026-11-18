// a typed import() that never runs keeps the accept on the required module
const load = () => import("./data.json", { with: { type: "json" } });

it("should accept a required JSON module next to a typed import()", (done) => {
	expect(typeof load).toBe("function");
	expect(require("./data.json").value).toBe("attr-1");
	module.hot.accept("./data.json", () => {
		expect(require("./data.json").value).toBe("attr-2");
		done();
	});
	NEXT(require("../../update")(done));
});
