const id = () => Math.random();

it("should compile", async () => {
	await expect(/* webpackMode: "lazy" */ import(`foo/${id()}`)).rejects.toBeTruthy();
	await expect(/* webpackMode: "lazy" */ import(`foo/${id()}`)).rejects.toBeTruthy();
	await expect(/* webpackMode: "lazy" */ import(`foo/${id()}`)).rejects.toBeTruthy();
});
