import value, { added } from "dll/item";

const path = require("path");
const probe = JSON.parse(
	require("fs").readFileSync(
		path.join(STATS_JSON.outputPath, "delegated-cache-probe.json"),
		"utf8"
	)
);

it("should rebuild DelegatedModule when the DLL manifest changes", () => {
	expect(value).toBe("dll-default");
	expect(added).toBe("dll-added");
});

it("should build DelegatedModule for the changed manifest metadata", () => {
	expect(probe).toEqual({ built: 1, reused: 0 });
});
