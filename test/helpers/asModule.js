const vm = require("vm");

module.exports = async (something, unlinkedInContext) => {
	if (
		something instanceof (vm.Module || /* node.js 10 */ vm.SourceTextModule)
	) {
		return something;
	}
	if (!vm.SyntheticModule) return something;
	const m = new vm.SyntheticModule(
		[...new Set(["default", ...Object.keys(something)])],
		function () {
			for (const key in something) {
				this.setExport(key, something[key]);
			}
			this.setExport("default", something);
		},
		{
			context: unlinkedInContext
		}
	);
	if (unlinkedInContext) return m;
	await m.link(() => {});
	if (m.instantiate) m.instantiate();
	await m.evaluate();
	return m;
};
