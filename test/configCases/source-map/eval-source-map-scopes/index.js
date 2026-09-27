import { mutable } from "./lib";

it("carries scopes in an eval source map", () => {
	const fs = require("fs");
	const source = fs.readFileSync(__filename, "utf-8");
	const maps = source.match(
		/sourceMappingURL=data:application\/json;charset=utf-8;base64,([\w+/=]+)/g
	);
	const withScopes = maps
		.map((one) =>
			JSON.parse(
				Buffer.from(one.split("base64,")[1], "base64").toString("utf-8")
			)
		)
		.filter((map) => map.scopes);

	expect(withScopes).toHaveLength(1);
	expect(withScopes[0].names).toContain("mutable");
	expect(mutable).toBe("mutable");
});
