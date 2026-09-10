import value from "dll/item";

const path = require("path");
const probe = JSON.parse(
	require("fs").readFileSync(
		path.join(STATS_JSON.outputPath, "delegated-cache-probe.json"),
		"utf8"
	)
);

it("should keep the rebuilt default-export interop", () => {
	expect(value).toEqual({
		default: "dll-default",
		added: "dll-added"
	});
});

it("should reuse DelegatedModule when the DLL manifest is unchanged", () => {
	expect(probe).toEqual({ built: 0, reused: 1 });
});
