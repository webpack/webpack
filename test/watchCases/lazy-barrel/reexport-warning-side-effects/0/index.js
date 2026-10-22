import { a } from "./pkg/barrel";
import { a as named } from "./pkg/named";
import { a as defaultBarrel } from "./pkg/default";
import { a as imported } from "./pkg/imported";
import { a as direct } from "./pkg/target";

it("should import only names the barrels do not defer", () => {
	expect([a, named, defaultBarrel, imported, direct]).toEqual([
		"barrel",
		"named",
		"default",
		"other",
		"target"
	]);
});
