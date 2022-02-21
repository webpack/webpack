const id = () => Math.random();

it("should compile", () => {
	expect(/* webpackMode: "lazy" */ import(`foo/${id()}`)).rejects.toBeTruthy();
	expect(/* webpackMode: "lazy" */ import(`foo/${id()}`)).rejects.toBeTruthy();
	expect(/* webpackMode: "lazy" */ import(`foo/${id()}`)).rejects.toBeTruthy();
});
