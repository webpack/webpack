var resolveResult;
exports.result = new Promise(function (resolve) {
	resolveResult = resolve;
});
require(["./value"], async function (value) {
	resolveResult(await Promise.resolve(value));
});
