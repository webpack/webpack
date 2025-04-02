it("should update info", () => {
	const file = new URL("./file.svg", import.meta.url);
	expect(/file\.svg$/.test(file)).toBe(true);
	const { info } = __STATS__.assets.find(item => item.name === "images/file.svg");
	expect(info.custom).toBe(true);
	expect(info.related).toEqual({"first": ["first"], "second": ["second"]});
	expect(info.customFn).toBe(true);

	const file1 = new URL("./file1.svg", import.meta.url);
	expect(/file1\.svg$/.test(file1)).toBe(true);
	const { info: info1 } = __STATS__.assets.find(item => item.name === "images/file1.svg");
	expect(info1.custom).toBeUndefined();
});
