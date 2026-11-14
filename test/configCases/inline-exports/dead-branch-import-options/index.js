import { isDEV } from "./env.js";

var makeOptions = function (value) {
	return { with: { type: value } };
};

it("should keep a dead-branch import() balanced when its options are computed", async () => {
	var name = "a";
	const ns = await (isDEV
		? import("./dead.js", makeOptions(require(`./dir/${name}.js`)))
		: import("./live.js"));
	expect(ns.V).toBe("LIVE_VALUE");
});

it("should warn about unknown attributes in the live branch only", async () => {
	var options = makeOptions("javascript");
	const ns = await (isDEV
		? import("./dead.js", makeOptions("text"))
		: import("./live.js", options).catch(() => import("./live.js")));
	expect(ns.V).toBe("LIVE_VALUE");
});
