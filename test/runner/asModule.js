"use strict";

const vm = require("vm");
const { ESModuleStatus, getNodeVersion } = require("./RunnerHelpers");

const [major] = getNodeVersion();

const SYNTHETIC_MODULES_STORE = "__SYNTHETIC_MODULES_STORE";
const LINKER = () => {};

/**
 * @param {vm.SourceTextModule | vm.Module | EXPECTED_ANY} something module or object
 * @param {EXPECTED_ANY} context context
 * @param {{ esmReturnStatus?: boolean }=} options options
 * @returns {Promise<vm.SourceTextModule>} module
 */
module.exports = async (something, context, options = {}) => {
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

	if (major === 10) {
		if (esm.linkingStatus === ESModuleStatus.Unlinked) {
			await esm.link(LINKER);
		}
		if (esm.linkingStatus === ESModuleStatus.Linked) {
			esm.instantiate();
		}
	} else if (esm.status === ESModuleStatus.Unlinked) {
		await esm.link(LINKER);
	}

	await esm.evaluate();
	return esm;
};
