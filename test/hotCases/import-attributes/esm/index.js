import foo from "./foo.js";

it("should handle HMR for esm", async function (done) {
	expect(foo).toBe("foo1");

	const { default: hi } = await import("./hi.t", { with: { type: "text" }});
	expect(hi).toBe("hi");

	const { default: info } = await import("./info.json", { with: { type: "json" }});
	expect(info.name).toBe("web");

	import.meta.webpackHot.accept(["./hi.t", "./info.json", "./foo.js"], () => {
	});

	NEXT(require("../../update.js")(done, true,async () => {
		expect(foo).toBe("foo2");
		done();
	}))
});

module.hot.accept();

