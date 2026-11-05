var resolveResult;
exports.result = new Promise(function (resolve) {
	resolveResult = resolve;
});
require.ensure(
	[],
	async function (require) {
		resolveResult(await Promise.resolve(require("./value")));
	},
	async function (error) {
		resolveResult(await Promise.reject(error));
	}
);
