import value from "dll/item";

const path = require("path");
const probe = JSON.parse(
	require("fs").readFileSync(
		path.join(STATS_JSON.outputPath, "delegated-cache-probe.json"),
		"utf8"
	)
);

it("should interop the default import using the namespace DLL manifest", () => {
	expect(value).toBe("dll-default");
});

it("should build DelegatedModule on the cold compile", () => {
	expect(probe).toEqual({ built: 1, reused: 0 });
});
