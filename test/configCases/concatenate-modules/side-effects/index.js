import {b, a} from "dep";

b.bbb();
a.aa();

it("should import modules in correct order", () => {
	expect(global.second).toBe(2);
});
