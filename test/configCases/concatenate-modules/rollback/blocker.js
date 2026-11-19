import { value as active } from "./z-active";
import { value as blocked } from "./blocked";

// Direct eval keeps this importer outside every concatenation group.
eval("");

it("should keep imports used by a module that cannot be concatenated", () => {
	expect([active, blocked]).toEqual([6, 7]);
});
