import { A, B, CC, D, E } from "./all";

require("./all");
require("./D");

it("should not rename classes unnecessary", () => {
	expect(A.name).toBe("A");
	expect(B.name).toBe("B_B");
	expect(CC.name).toBe("C");
	expect(D.name).toBe("D");
	expect(E.name).toBe("E");
});
