import a from "./dep.js"

const global = a();

it("should generate indirect call", () => {
	expect(a()).toBeUndefined();
	expect((a)()).toBeUndefined();
	expect((a())).toBeUndefined();
	expect(global).toBeUndefined();
});
