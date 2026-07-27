import { A, B, CC, D, E } from "./all";

require("./all");
require("./D");

it("should not rename classes unnecessary", () => {
	// the `require()` above wraps "./all" and everything it pulls in, so every
	// class body sits in its own wrapper scope and none of them can collide
	expect(A.name).toBe("A");
	expect(B.name).toBe("B");
	expect(CC.name).toBe("C");
	expect(D.name).toBe("D");
	expect(E.name).toBe("E");
});
