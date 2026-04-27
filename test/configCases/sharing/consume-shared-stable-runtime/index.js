import a from "./a";
import b from "./b";
import c from "./c";
import d from "./d";

it("should load every consumed share", () => {
	expect(a).toBe("a");
	expect(b).toBe("b");
	expect(c).toBe("c");
	expect(d).toBe("d");
});
