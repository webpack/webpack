import { m } from "./m";
import * as a from "./a";

it("should keep the hash of a module whose unused import changes usage", () => {
	expect(m).toBe(1);
	expect(a.y).toBe(2);
});
