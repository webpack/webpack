import * as barrel from "./pkg/barrel";
import * as named from "./pkg/named";
import * as defaultBarrel from "./pkg/default";
import * as imported from "./pkg/imported";
import { a as direct } from "./pkg/target";

it("should request every name once the whole namespaces are used", () => {
	expect(Object.keys(barrel)).toEqual(["a", "r0"]);
	expect(Object.keys(named)).toEqual(["a", "b"]);
	expect(Object.keys(defaultBarrel)).toEqual(["a", "default"]);
	expect(Object.keys(imported)).toEqual(["a", "b"]);
	expect(direct).toBe("target");
});
