"use strict";

const vm = require("vm");
const { ESModuleStatus } = require("./RunnerHelpers");

const SYNTHETIC_MODULES_STORE = "__SYNTHETIC_MODULES_STORE";
const LINKER = () => {};

/**
 * @param {vm.SourceTextModule | vm.Module | EXPECTED_ANY} something module or object
 * @param {EXPECTED_ANY} context context
 * @param {{ esmReturnStatus?: string }=} options options
 * @param {Record<string, string>=} importAttributes import attributes
 * @returns {Promise<vm.SourceTextModule | vm.SyntheticModule>} module
 */
module.exports = async (
	something,
	context,
	options = {},
	importAttributes = {}
) => {
	if (something instanceof vm.Module) {
		return /** @type {vm.SourceTextModule} */ (something);
	}

	if (importAttributes && importAttributes.type === "bytes") {
		const byteModule = new vm.SyntheticModule(
			["default"],
			function evaluateCallback() {
				this.setExport("default", something);
			},
			{ context }
		);

		await byteModule.link(/** @type {EXPECTED_ANY} */ (() => {}));
		await byteModule.evaluate();

		return byteModule;
	}

	context[SYNTHETIC_MODULES_STORE] = context[SYNTHETIC_MODULES_STORE] || [];
	const i = context[SYNTHETIC_MODULES_STORE].length;
	context[SYNTHETIC_MODULES_STORE].push(something);
	const code = [...new Set(["default", ...Object.keys(something)])]
		.map(
			(name) =>
				`const _${name} = ${SYNTHETIC_MODULES_STORE}[${i}]${
					name === "default" ? "" : `[${JSON.stringify(name)}]`
				}; export { _${name} as ${name}};`
		)
		.join("\n");

	const esm = new vm.SourceTextModule(code, {
		context
	});
	if (options.esmReturnStatus === ESModuleStatus.Unlinked) return esm;

	if (esm.status === ESModuleStatus.Unlinked) {
		await esm.link(/** @type {EXPECTED_ANY} */ (() => {}));
	}

	await esm.evaluate();
	return esm;
};
