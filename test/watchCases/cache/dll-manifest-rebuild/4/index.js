import value, { added } from "dll/item";

const path = require("path");
const probe = JSON.parse(
	require("fs").readFileSync(
		path.join(STATS_JSON.outputPath, "delegated-cache-probe.json"),
		"utf8"
	)
);

it("should rebuild DelegatedModule when only the DLL manifest exports change", () => {
	expect(value).toBe("dll-default");
	expect(added).toBe("dll-added");
});

it("should build DelegatedModule for the changed exports", () => {
	expect(probe).toEqual({ built: 1, reused: 0 });
});
