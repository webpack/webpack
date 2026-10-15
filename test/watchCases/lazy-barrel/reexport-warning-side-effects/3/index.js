import * as barrel from "./pkg/barrel";
import { a as direct } from "./pkg/target";

it("should request every name once the whole namespace is used", () => {
	expect(Object.keys(barrel)).toEqual(["a", "r0"]);
	expect(direct).toBe("target");
});
