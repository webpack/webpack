"use strict";

const fs = require("fs");
const path = require("path");
const generateWatchSequence = require("../../../helpers/generateWatchSequence");
const minimizeWatchSequence = require("../../../helpers/minimizeWatchSequence");
const createWatchTestSession = require("../../../helpers/watchTestSession");

/** @import { Operation } from "../../../helpers/generateWatchSequence" */
/** @import { FileChanges, ScenarioOptions } from "../../../helpers/watchTestSession" */
/** @typedef {{ values: number[], target: 0 | 1, name: string, added: boolean, present: boolean, valid: boolean, sideEffects: boolean, packageMain: 0 | 1 }} Model */
/** @typedef {{ error: Error, step: number, phase: string }} Failure */

/**
 * @param {Model} model expected project state
 * @param {Operation} operation mutation to apply
 * @returns {void}
 */
const applyOperation = (model, operation) => {
	switch (operation.kind) {
		case "value":
			model.values[operation.target] = operation.value;
			break;
		case "retarget":
			model.target = operation.target;
			break;
		case "rename":
			model.name = operation.name;
			break;
		case "add":
			model.added = true;
			break;
		case "remove":
			model.present = false;
			break;
		case "restore":
			model.present = true;
			break;
		case "break":
			model.valid = false;
			break;
		case "repair":
			model.valid = true;
			break;
		case "side-effects":
			model.sideEffects = operation.enabled;
			break;
		case "package-main":
			model.packageMain = operation.target;
			break;
	}
};

/**
 * @param {Model} model expected project state
 * @returns {FileChanges} complete project files
 */
const renderProject = (model) => ({
	"index.js":
		'import * as data from "./barrel"; import { state } from "./state"; import "./package"; export default { data, effect: state.value };',
	"barrel.js": `export * from "./leaf${model.target}";`,
	"leaf0.js": !model.present
		? null
		: model.valid
			? `export const ${model.name} = ${model.values[0]};`
			: "export const = ;",
	"leaf1.js":
		!model.present || !model.added
			? null
			: model.valid
				? `export const ${model.name} = ${model.values[1]};`
				: "export const = ;",
	"state.js": "export const state = { value: 0 };",
	"package/package.json": JSON.stringify({
		main: `./entry${model.packageMain}.js`,
		sideEffects: model.sideEffects
	}),
	"package/entry0.js": 'import { state } from "../state"; state.value = 17;',
	"package/entry1.js": 'import { state } from "../state"; state.value = 29;'
});

/**
 * @param {ScenarioOptions} options suite options
 * @returns {void}
 */
module.exports = (options) => {
	const seeds =
		process.env.WEBPACK_WATCH_SEED === undefined
			? [1, 0xc0ffee, 0xdeadbeef]
			: [Number(process.env.WEBPACK_WATCH_SEED)];
	for (const seed of seeds) {
		if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
			throw new Error("WEBPACK_WATCH_SEED must be an unsigned 32-bit integer");
		for (const mode of /** @type {const} */ (["development", "production"])) {
			it(`should match fresh builds for seed ${seed} in ${mode}`, async () => {
				const directory = path.join(options.directory, `${seed}-${mode}`);
				/**
				 * @param {Operation[]} sequence sequence to replay
				 * @returns {Promise<Failure | undefined>} first mismatch
				 */
				const replay = async (sequence) => {
					const session = createWatchTestSession(
						directory,
						{
							mode,
							experiments: options.experiments,
							cache: { type: mode === "development" ? "memory" : "filesystem" },
							optimization: {
								minimize: false,
								moduleIds: "named",
								chunkIds: "named"
							}
						},
						{
							skipFreshAssetContent:
								"Retargeting and error recovery retain code generation metadata; compare runtime exports with the fresh build and the model instead."
						}
					);
					/** @type {Model} */
					const model = {
						values: [1, 2],
						target: 0,
						name: "value",
						added: false,
						present: true,
						valid: true,
						sideEffects: false,
						packageMain: 0
					};
					/** @type {FileChanges} */
					let previousFiles = {};
					let step = -1;
					let phase = "build";
					try {
						for (; step < sequence.length; step++) {
							if (step >= 0) applyOperation(model, sequence[step]);
							const files = renderProject(model);
							/** @type {FileChanges} */
							const edits = {};
							for (const name of Object.keys(files)) {
								if (files[name] !== previousFiles[name])
									edits[name] = files[name];
							}
							previousFiles = files;
							session.write(edits);
							phase = "build";
							const stats =
								step < 0
									? await session.start()
									: (
											await Promise.all([
												session.nextBuild(),
												session.invalidate()
											])
										)[0];
							phase = "fresh comparison";
							await session.compare(stats);
							phase = "runtime";
							expect(stats.hasErrors()).toBe(
								!model.present ||
									!model.valid ||
									(model.target === 1 && !model.added)
							);
							if (!stats.hasErrors()) {
								expect(session.readExports()).toEqual({
									default: {
										data: { [model.name]: model.values[model.target] },
										effect: model.sideEffects
											? model.packageMain === 0
												? 17
												: 29
											: 0
									}
								});
							}
						}
					} catch (error) {
						return { error: /** @type {Error} */ (error), step, phase };
					} finally {
						await session.close();
					}
				};
				const sequence = process.env.WEBPACK_WATCH_SEQUENCE
					? /** @type {Operation[]} */ (
							JSON.parse(process.env.WEBPACK_WATCH_SEQUENCE)
						)
					: generateWatchSequence(seed);
				const failure = await replay(sequence);
				if (failure) {
					const prefix = sequence.slice(0, failure.step + 1);
					const minimal =
						process.env.WEBPACK_WATCH_SEQUENCE || failure.phase === "build"
							? prefix
							: await minimizeWatchSequence(prefix, async (candidate) => {
									const result = await replay(candidate);
									return (
										result !== undefined &&
										result.phase === failure.phase &&
										result.error.name === failure.error.name
									);
								});
					fs.writeFileSync(
						path.join(directory, "replay.json"),
						JSON.stringify({ seed, mode, sequence: minimal }, null, 2)
					);
					throw new Error(
						`Watch seed ${seed}, mode ${mode}, phase ${failure.phase}, step ${failure.step}\nWEBPACK_WATCH_SEQUENCE='${JSON.stringify(minimal)}'\n${failure.error.stack}`
					);
				}
			}, 120000);
		}
	}
};
