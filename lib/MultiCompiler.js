/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const asyncLib = require("neo-async");
const { SyncHook, MultiHook } = require("tapable");

const ConcurrentCompilationError = require("./ConcurrentCompilationError");
const MultiStats = require("./MultiStats");
const MultiWatching = require("./MultiWatching");

/** @template T @typedef {import("tapable").AsyncSeriesHook<T>} AsyncSeriesHook<T> */
/** @template T @template R @typedef {import("tapable").SyncBailHook<T, R>} SyncBailHook<T, R> */
/** @typedef {import("../declarations/WebpackOptions").WatchOptions} WatchOptions */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Stats")} Stats */
/** @typedef {import("./Watching")} Watching */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */
/** @typedef {import("./util/fs").IntermediateFileSystem} IntermediateFileSystem */
/** @typedef {import("./util/fs").OutputFileSystem} OutputFileSystem */
/** @typedef {import("./util/fs").WatchFileSystem} WatchFileSystem */

/** @typedef {number} CompilerStatus */

const STATUS_PENDING = 0;
const STATUS_DONE = 1;
const STATUS_NEW = 2;

/**
 * @template T
 * @callback Callback
 * @param {Error=} err
 * @param {T=} result
 */

/**
 * @callback RunWithDependenciesHandler
 * @param {Compiler} compiler
 * @param {Callback<MultiStats>} callback
 */

module.exports = class MultiCompiler {
	/**
	 * @param {Compiler[] | Record<string, Compiler>} compilers child compilers
	 */
	constructor(compilers) {
		if (!Array.isArray(compilers)) {
			compilers = Object.keys(compilers).map(name => {
				compilers[name].name = name;
				return compilers[name];
			});
		}

		this.hooks = Object.freeze({
			/** @type {SyncHook<[MultiStats]>} */
			done: new SyncHook(["stats"]),
			/** @type {MultiHook<SyncHook<[string | null, number]>>} */
			invalid: new MultiHook(compilers.map(c => c.hooks.invalid)),
			/** @type {MultiHook<AsyncSeriesHook<[Compiler]>>} */
			run: new MultiHook(compilers.map(c => c.hooks.run)),
			/** @type {SyncHook<[]>} */
			watchClose: new SyncHook([]),
			/** @type {MultiHook<AsyncSeriesHook<[Compiler]>>} */
			watchRun: new MultiHook(compilers.map(c => c.hooks.watchRun)),
			/** @type {MultiHook<SyncBailHook<[string, string, any[]], true>>} */
			infrastructureLog: new MultiHook(
				compilers.map(c => c.hooks.infrastructureLog)
			)
		});
		this.compilers = compilers;
		/** @type {WeakMap<Compiler, string[]>} */
		this.dependencies = new WeakMap();
		this.running = false;

		/** @type {Stats[]} */
		const compilerStats = this.compilers.map(() => null);
		let doneCompilers = 0;
		for (let index = 0; index < this.compilers.length; index++) {
			const compiler = this.compilers[index];
			const compilerIndex = index;
			let compilerDone = false;
			// eslint-disable-next-line no-loop-func
			compiler.hooks.done.tap("MultiCompiler", stats => {
				if (!compilerDone) {
					compilerDone = true;
					doneCompilers++;
				}
				compilerStats[compilerIndex] = stats;
				if (doneCompilers === this.compilers.length) {
					this.hooks.done.call(new MultiStats(compilerStats));
				}
			});
			// eslint-disable-next-line no-loop-func
			compiler.hooks.invalid.tap("MultiCompiler", () => {
				if (compilerDone) {
					compilerDone = false;
					doneCompilers--;
				}
			});
		}
	}

	get options() {
		return this.compilers.map(c => c.options);
	}

	get outputPath() {
		let commonPath = this.compilers[0].outputPath;
		for (const compiler of this.compilers) {
			while (
				compiler.outputPath.indexOf(commonPath) !== 0 &&
				/[/\\]/.test(commonPath)
			) {
				commonPath = commonPath.replace(/[/\\][^/\\]*$/, "");
			}
		}

		if (!commonPath && this.compilers[0].outputPath[0] === "/") return "/";
		return commonPath;
	}

	get inputFileSystem() {
		throw new Error("Cannot read inputFileSystem of a MultiCompiler");
	}

	get outputFileSystem() {
		throw new Error("Cannot read outputFileSystem of a MultiCompiler");
	}

	get watchFileSystem() {
		throw new Error("Cannot read watchFileSystem of a MultiCompiler");
	}

	get intermediateFileSystem() {
		throw new Error("Cannot read outputFileSystem of a MultiCompiler");
	}

	/**
	 * @param {InputFileSystem} value the new input file system
	 */
	set inputFileSystem(value) {
		for (const compiler of this.compilers) {
			compiler.inputFileSystem = value;
		}
	}

	/**
	 * @param {OutputFileSystem} value the new output file system
	 */
	set outputFileSystem(value) {
		for (const compiler of this.compilers) {
			compiler.outputFileSystem = value;
		}
	}

	/**
	 * @param {WatchFileSystem} value the new watch file system
	 */
	set watchFileSystem(value) {
		for (const compiler of this.compilers) {
			compiler.watchFileSystem = value;
		}
	}

	/**
	 * @param {IntermediateFileSystem} value the new intermediate file system
	 */
	set intermediateFileSystem(value) {
		for (const compiler of this.compilers) {
			compiler.intermediateFileSystem = value;
		}
	}

	getInfrastructureLogger(name) {
		return this.compilers[0].getInfrastructureLogger(name);
	}

	/**
	 * @param {Compiler} compiler the child compiler
	 * @param {string[]} dependencies its dependencies
	 * @returns {void}
	 */
	setDependencies(compiler, dependencies) {
		this.dependencies.set(compiler, dependencies);
	}

	/**
	 * @param {Callback<MultiStats>} callback signals when the validation is complete
	 * @returns {boolean} true if the dependencies are valid
	 */
	validateDependencies(callback) {
		/** @type {Set<{source: Compiler, target: Compiler}>} */
		const edges = new Set();
		/** @type {string[]} */
		const missing = [];
		const targetFound = compiler => {
			for (const edge of edges) {
				if (edge.target === compiler) {
					return true;
				}
			}
			return false;
		};
		const sortEdges = (e1, e2) => {
			return (
				e1.source.name.localeCompare(e2.source.name) ||
				e1.target.name.localeCompare(e2.target.name)
			);
		};
		for (const source of this.compilers) {
			const dependencies = this.dependencies.get(source);
			if (dependencies) {
				for (const dep of dependencies) {
					const target = this.compilers.find(c => c.name === dep);
					if (!target) {
						missing.push(dep);
					} else {
						edges.add({
							source,
							target
						});
					}
				}
			}
		}
		/** @type {string[]} */
		const errors = missing.map(m => `Compiler dependency \`${m}\` not found.`);
		const stack = this.compilers.filter(c => !targetFound(c));
		while (stack.length > 0) {
			const current = stack.pop();
			for (const edge of edges) {
				if (edge.source === current) {
					edges.delete(edge);
					const target = edge.target;
					if (!targetFound(target)) {
						stack.push(target);
					}
				}
			}
		}
		if (edges.size > 0) {
			/** @type {string[]} */
			const lines = Array.from(edges)
				.sort(sortEdges)
				.map(edge => `${edge.source.name} -> ${edge.target.name}`);
			lines.unshift("Circular dependency found in compiler dependencies.");
			errors.unshift(lines.join("\n"));
		}
		if (errors.length > 0) {
			const message = errors.join("\n");
			callback(new Error(message));
			return false;
		}
		return true;
	}

	/**
	 * @param {Compiler[]} compilers the child compilers
	 * @param {RunWithDependenciesHandler} fn a handler to run for each compiler
	 * @param {Callback<MultiStats>} callback the compiler's handler
	 * @returns {void}
	 */
	runWithDependencies(compilers, fn, callback) {
		const fulfilledNames = new Set();
		let remainingCompilers = compilers;
		const isDependencyFulfilled = d => fulfilledNames.has(d);
		const getReadyCompilers = () => {
			let readyCompilers = [];
			let list = remainingCompilers;
			remainingCompilers = [];
			for (const c of list) {
				const dependencies = this.dependencies.get(c);
				const ready =
					!dependencies || dependencies.every(isDependencyFulfilled);
				if (ready) {
					readyCompilers.push(c);
				} else {
					remainingCompilers.push(c);
				}
			}
			return readyCompilers;
		};
		const runCompilers = callback => {
			if (remainingCompilers.length === 0) return callback();
			asyncLib.map(
				getReadyCompilers(),
				(compiler, callback) => {
					fn(compiler, err => {
						if (err) return callback(err);
						fulfilledNames.add(compiler.name);
						runCompilers(callback);
					});
				},
				callback
			);
		};
		runCompilers(callback);
	}

	/**
	 * @param {WatchOptions|WatchOptions[]} watchOptions the watcher's options
	 * @param {Callback<MultiStats>} handler signals when the call finishes
	 * @returns {MultiWatching} a compiler watcher
	 */
	watch(watchOptions, handler) {
		if (this.running) {
			return handler(new ConcurrentCompilationError());
		}

		/** @type {Watching[]} */
		const watchings = [];

		/** @type {Stats[]} */
		const allStats = this.compilers.map(() => null);

		/** @type {CompilerStatus[]} */
		const compilerStatus = this.compilers.map(() => STATUS_PENDING);

		if (this.validateDependencies(handler)) {
			this.running = true;
			this.runWithDependencies(
				this.compilers,
				(compiler, callback) => {
					const compilerIdx = this.compilers.indexOf(compiler);
					let firstRun = true;
					let watching = compiler.watch(
						Array.isArray(watchOptions)
							? watchOptions[compilerIdx]
							: watchOptions,
						(err, stats) => {
							if (err) handler(err);
							if (stats) {
								allStats[compilerIdx] = stats;
								compilerStatus[compilerIdx] = STATUS_NEW;
								if (compilerStatus.every(status => status !== STATUS_PENDING)) {
									const freshStats = allStats.filter((s, idx) => {
										return compilerStatus[idx] === STATUS_NEW;
									});
									compilerStatus.fill(STATUS_DONE);
									const multiStats = new MultiStats(freshStats);
									handler(null, multiStats);
								}
							}
							if (firstRun && !err) {
								firstRun = false;
								callback();
							}
						}
					);
					watchings.push(watching);
				},
				() => {
					// ignore
				}
			);
		}

		return new MultiWatching(watchings, this);
	}

	/**
	 * @param {Callback<MultiStats>} callback signals when the call finishes
	 * @returns {void}
	 */
	run(callback) {
		if (this.running) {
			return callback(new ConcurrentCompilationError());
		}

		const finalCallback = (err, stats) => {
			this.running = false;

			if (callback !== undefined) {
				return callback(err, stats);
			}
		};

		const allStats = this.compilers.map(() => null);
		if (this.validateDependencies(callback)) {
			this.running = true;
			this.runWithDependencies(
				this.compilers,
				(compiler, callback) => {
					const compilerIdx = this.compilers.indexOf(compiler);
					compiler.run((err, stats) => {
						if (err) {
							return callback(err);
						}
						allStats[compilerIdx] = stats;
						callback();
					});
				},
				err => {
					if (err) {
						return finalCallback(err);
					}
					finalCallback(null, new MultiStats(allStats));
				}
			);
		}
	}

	purgeInputFileSystem() {
		for (const compiler of this.compilers) {
			if (compiler.inputFileSystem && compiler.inputFileSystem.purge) {
				compiler.inputFileSystem.purge();
			}
		}
	}

	/**
	 * @param {Callback<void>} callback signals when the compiler closes
	 * @returns {void}
	 */
	close(callback) {
		asyncLib.each(
			this.compilers,
			(compiler, callback) => {
				compiler.close(callback);
			},
			callback
		);
	}
};
