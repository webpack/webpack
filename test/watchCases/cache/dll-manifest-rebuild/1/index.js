import value from "dll/item";

const path = require("path");
const probe = JSON.parse(
	require("fs").readFileSync(
		path.join(STATS_JSON.outputPath, "delegated-cache-probe.json"),
		"utf8"
	)
);

it("should rebuild DelegatedModule when the DLL manifest buildMeta changes", () => {
	expect(value).toEqual({
		default: "dll-default",
		added: "dll-added"
	});
});

it("should build DelegatedModule for the changed DLL manifest", () => {
	expect(probe).toEqual({ built: 1, reused: 0 });
});
