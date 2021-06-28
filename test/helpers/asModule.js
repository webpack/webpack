const vm = require("vm");

const SYNTHETIC_MODULES_STORE = "__SYNTHETIC_MODULES_STORE";

module.exports = async (something, context, unlinked) => {
	if (
		something instanceof (vm.Module || /* node.js 10 */ vm.SourceTextModule)
	) {
		return something;
	}
	context[SYNTHETIC_MODULES_STORE] = context[SYNTHETIC_MODULES_STORE] || [];
	const i = context[SYNTHETIC_MODULES_STORE].length;
	context[SYNTHETIC_MODULES_STORE].push(something);
	const code = [...new Set(["default", ...Object.keys(something)])]
		.map(
			name =>
				`const _${name} = ${SYNTHETIC_MODULES_STORE}[${i}][${JSON.stringify(
					name
				)}]; export { _${name} as ${name}};`
		)
		.join("\n");
	const m = new vm.SourceTextModule(code, {
		context
	});
	if (unlinked) return m;
	await m.link(() => {});
	if (m.instantiate) m.instantiate();
	await m.evaluate();
	return m;
};
