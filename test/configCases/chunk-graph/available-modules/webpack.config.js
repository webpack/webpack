"use strict";

const webpack = require("../../../../");

const { VirtualUrlPlugin } = webpack.experiments.schemes;
const { WebpackError } = webpack;

/** @typedef {import("../../../../").Compilation} Compilation */
/** @typedef {import("../../../../").Configuration} Configuration */

const scenarios = [
	"late-addition",
	"late-and-new-child",
	"early-addition",
	"preserve-mask",
	"grow-then-shrink",
	"multiple-parents",
	"cycle",
	"multiple-runtimes",
	"worker-boundary",
	"two-growing-parents",
	"inherited-growth",
	"late-addition-with-restore",
	"late-worker-addition",
	"late-block-same-parent",
	"late-existing-module"
];

/**
 * Rewrites `./name` requests to `virtual:name.js`, as a virtual module resolves relative requests on disk.
 * @param {Record<string, string>} modules sources by file name
 * @returns {Record<string, string>} sources by file name, with virtual requests
 */
const toVirtualModules = (modules) => {
	/** @type {Record<string, string>} */
	const result = {};
	for (const name of Object.keys(modules)) {
		result[name] = modules[name].replace(
			/(["'])\.\/([\w-]+)(?:\.js)?\1/g,
			"$1virtual:$2.js$1"
		);
	}
	return result;
};

/**
 * @param {Compilation} compilation the compilation
 * @param {string} groupName the named chunk group to look in
 * @param {string} file the virtual module file to count
 * @returns {number} how many chunks of that group contain the module
 */
const countModule = (compilation, groupName, file) => {
	const group = compilation.namedChunkGroups.get(groupName);
	if (!group) throw new Error(`Chunk group "${groupName}" was not created`);
	let count = 0;
	for (const chunk of group.chunks) {
		for (const module of compilation.chunkGraph.getChunkModulesIterable(
			chunk
		)) {
			if (module.nameForCondition() === `virtual:${file}`) count++;
		}
	}
	return count;
};

/**
 * @param {Compilation} compilation the compilation
 * @param {string} chunkName the named chunk to look in
 * @param {string} file the virtual module file to look for
 * @returns {boolean} whether the chunk contains the module
 */
const chunkHasModule = (compilation, chunkName, file) => {
	const chunk = compilation.namedChunks.get(chunkName);
	if (!chunk) throw new Error(`Chunk "${chunkName}" was not created`);
	for (const module of compilation.chunkGraph.getChunkModulesIterable(chunk)) {
		if (module.nameForCondition() === `virtual:${file}`) return true;
	}
	return false;
};

/**
 * @param {string} scenario the scenario name
 * @param {Compilation} compilation the compilation
 * @returns {string[]} the failed expectations
 */
const check = (scenario, compilation) => {
	/** @type {string[]} */
	const failures = [];
	/**
	 * @param {boolean} condition the expectation
	 * @param {string} message what failed
	 */
	const expect = (condition, message) => {
		if (!condition) failures.push(`${scenario}: ${message}`);
	};
	const retains = [
		"grow-then-shrink",
		"multiple-parents",
		"multiple-runtimes",
		"worker-boundary"
	].includes(scenario);
	expect(
		countModule(compilation, "child", "m.js") === (retains ? 1 : 0),
		`"child" should ${retains ? "" : "not "}contain m.js`
	);
	if (scenario === "late-and-new-child") {
		expect(
			countModule(compilation, "next-child", "m.js") === 0,
			'"next-child" should not contain m.js'
		);
	}
	if (scenario === "inherited-growth") {
		expect(
			countModule(compilation, "grandchild", "m.js") === 0,
			'"grandchild" should not contain m.js'
		);
	}
	if (scenario === "late-addition-with-restore") {
		expect(
			chunkHasModule(compilation, "parent", "x.js"),
			'"parent" should restore x.js lost from the inherited intersection'
		);
		expect(
			countModule(compilation, "child", "x.js") === 0,
			'"child" should not contain x.js'
		);
	}
	if (scenario === "late-worker-addition") {
		expect(
			chunkHasModule(compilation, "worker", "m.js"),
			'"worker" should contain m.js'
		);
		for (const name of ["worker-child", "worker-next"]) {
			expect(
				countModule(compilation, name, "m.js") === 0,
				`"${name}" should inherit m.js from the late worker module`
			);
		}
	}
	return failures;
};

/**
 * @param {string} scenario the scenario name
 * @returns {Record<string, string>} sources by file name
 */
const getModules = (scenario) => ({
	"index.js": `
		${scenario === "late-addition-with-restore" ? "export const direct = async () => (await import(/* webpackChunkName: 'root' */ './root')).load();" : "export const direct = () => import(/* webpackChunkName: 'parent' */ './parent-a');"}
		export const indirect = () => import(/* webpackChunkName: 'q' */ './q');
		${scenario === "early-addition" ? "export const early = () => import(/* webpackChunkName: 'parent' */ './parent-b');" : ""}
		${scenario === "multiple-parents" ? "export const child = () => import(/* webpackChunkName: 'child' */ './child');" : ""}
		${scenario === "worker-boundary" ? "export const worker = () => new Worker(/* webpackChunkName: 'worker' */ new URL('./worker', import.meta.url));" : ""}
		${scenario === "late-worker-addition" ? "export const worker = () => new Worker(/* webpackChunkName: 'worker' */ new URL('./worker-a', import.meta.url));" : ""}
		${scenario === "two-growing-parents" ? "export const second = () => import(/* webpackChunkName: 'parent2' */ './parent2-a');" : ""}
		it('maintains available modules: ${scenario}', async () => {
			// First load the direct path, before executing the late named import.
			${scenario === "preserve-mask" ? "expect((await direct()).value).toBe(42);" : scenario === "inherited-growth" ? "expect((await (await (await direct()).load()).load()).value).toBe(42);" : "expect((await (await direct()).load()).value).toBe(42);"}
			${scenario === "two-growing-parents" ? "expect((await (await second()).load()).value).toBe(42);" : ""}
			const r = await (await indirect()).load();
			const addition = await r.load();
			${scenario === "preserve-mask" ? "expect((await addition.load()).value).toBe(42);" : "expect(addition.value).toBe(42);"}
			${scenario === "grow-then-shrink" ? "expect((await (await (await r.later()).load()).load()).value).toBe(42);" : ""}
			${scenario === "two-growing-parents" ? "expect((await (await r.later()).load()).value).toBe(42);" : ""}
		});
	`,
	"parent-a.js":
		scenario === "preserve-mask"
			? "export { value } from './m';"
			: `${scenario === "late-addition-with-restore" ? "export { value } from './x';" : ""}
				${scenario === "late-existing-module" ? "export { value } from './m';" : ""}
				export const load = () => import(/* webpackChunkName: 'child' */ './child');`,
	"root.js": `export { value } from './x';
		export const load = () => import(/* webpackChunkName: 'parent' */ './parent-a');`,
	"x.js": "export const value = 43;",
	"q.js": `export const load = () => import(/* webpackChunkName: 'r' */ './r');
		${scenario === "late-block-same-parent" ? "export const parent = () => import(/* webpackChunkName: 'parent' */ './parent-a');" : ""}`,
	"q-b.js":
		"export const load = () => import(/* webpackChunkName: 'parent' */ './parent-b');",
	"r.js": `${
		scenario === "late-block-same-parent"
			? "export const load = async () => (await import(/* webpackChunkName: 'q' */ './q-b')).load();"
			: `export const load = () => import(/* webpackChunkName: 'parent' */ './${scenario === "late-existing-module" ? "parent-a" : "parent-b"}');`
	}
		${scenario === "late-worker-addition" ? "export const worker = () => new Worker(/* webpackChunkName: 'worker' */ new URL('./worker-b', import.meta.url));" : ""}
		${scenario === "grow-then-shrink" || scenario === "two-growing-parents" ? "export const later = () => import(/* webpackChunkName: 's' */ './s');" : ""}`,
	"s.js":
		scenario === "two-growing-parents"
			? "export const load = () => import(/* webpackChunkName: 'parent2' */ './parent2-b');"
			: "export const load = () => import(/* webpackChunkName: 't' */ './t');",
	"parent2-a.js":
		"export const load = () => import(/* webpackChunkName: 'child' */ './child');",
	"parent2-b.js": "export { value } from './m';",
	"grandchild.js": "export { value } from './m';",
	"t.js":
		"export const load = () => import(/* webpackChunkName: 'child' */ './child');",
	"parent-b.js":
		scenario === "preserve-mask"
			? "export const load = () => import(/* webpackChunkName: 'child' */ './child');"
			: `export { value } from './m'; ${scenario === "late-and-new-child" ? "export const next = () => import(/* webpackChunkName: 'next-child' */ './next-child');" : ""}`,
	"next-child.js": "export { value } from './m';",
	"child.js":
		scenario === "inherited-growth"
			? "export const load = () => import(/* webpackChunkName: 'grandchild' */ './grandchild');"
			: `export { value } from './m';
				${scenario === "late-addition-with-restore" ? "export { value as restored } from './x';" : ""}
				${scenario === "cycle" ? "export const back = () => import(/* webpackChunkName: 'parent' */ './parent-a');" : ""}`,
	"m.js": "export const value = 42;",
	"extra.js":
		"export const load = () => import(/* webpackChunkName: 'child' */ './child');",
	"worker.js":
		"export const load = () => import(/* webpackChunkName: 'child' */ './child');",
	"worker-a.js":
		"export const load = () => import(/* webpackChunkName: 'worker-child' */ './worker-child');",
	"worker-b.js": `export { value } from './m';
		export const load = () => import(/* webpackChunkName: 'worker-next' */ './worker-next');`,
	"worker-child.js": "export { value } from './m';",
	"worker-next.js": "export { value } from './m';"
});

/** @type {Configuration[]} */
module.exports = scenarios.map((scenario, index) => ({
	mode: "production",
	target: "web",
	devtool: false,
	cache: false,
	entry:
		scenario === "multiple-runtimes"
			? { main: "virtual:index.js", extra: "virtual:extra.js" }
			: { main: "virtual:index.js" },
	output: {
		// One JSONP chunk loading global for each bundle, as they run in one realm.
		uniqueName: `available-modules-${index}`,
		filename: `[name]-${index}.js`,
		chunkFilename: `[name]-${index}.js`
	},
	optimization: {
		splitChunks: false,
		minimize: false,
		concatenateModules: false,
		usedExports: false,
		moduleIds: "named",
		chunkIds: "named"
	},
	plugins: [
		new VirtualUrlPlugin(toVirtualModules(getModules(scenario))),
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", (compilation) => {
					compilation.hooks.afterChunks.tap("Test", () => {
						for (const failure of check(scenario, compilation)) {
							compilation.errors.push(new WebpackError(failure));
						}
					});
				});
			}
		}
	]
}));
