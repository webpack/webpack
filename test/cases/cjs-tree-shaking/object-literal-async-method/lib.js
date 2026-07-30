module.exports = {
	used: "used",
	async unusedAsync() {
		await Promise.resolve(1);
		return "unused-async";
	},
	*unusedGen() {
		yield 1;
		return "unused-gen";
	},
	async *unusedAsyncGen() {
		await Promise.resolve();
		yield 2;
		return "unused-async-gen";
	},
	usedExports: __webpack_exports_info__.usedExports
};
