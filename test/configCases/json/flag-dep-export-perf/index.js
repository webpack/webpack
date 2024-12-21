export * from './data.json';

it("should compile and run", () => {
	expect(__webpack_exports_info__.depth_1.provideInfo).toBe(true)
	expect(__webpack_exports_info__._depth_1.provideInfo).toBe(true)
	expect(__webpack_exports_info__.__depth_1.provideInfo).toBe(true)

	expect(__webpack_exports_info__.depth_1.depth_2.provideInfo).toBe(undefined)
	expect(__webpack_exports_info__._depth_1._depth_2._depth_3._depth_4.provideInfo).toBe(undefined)
	expect(__webpack_exports_info__.__depth_1[0].__depth_3[0].__depth_5.provideInfo).toBe(undefined)
});
