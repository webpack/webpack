export const c = 3;

it("should aggregate exports from all entry modules (issue #15936)", function () {
	expect(MyLib.a).toBe(1);
	expect(MyLib.b).toBe(2);
	expect(MyLib.c).toBe(3);
});
