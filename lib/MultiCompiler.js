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
const ArrayQueue = require("./util/ArrayQueue");

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

/**
 * @typedef {Object} MultiCompilerOptions
 * @property {number=} parallelism how many Compilers are allows to run at the same time in parallel
 */

module.exports = class MultiCompiler {
	/**
	 * @param {Compiler[] | Record<string, Compiler>} compilers child compilers
	 * @param {MultiCompilerOptions} options options
	 */
	constructor(compilers, options) {
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
		/** @type {MultiCompilerOptions} */
		this._options = {
			parallelism: options.parallelism || Infinity
		};
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
		return Object.assign(
			this.compilers.map(c => c.options),
			this._options
		);
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

	// TODO webpack 6 remove
	/**
	 * @deprecated This method should have been private
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
	 * @template SetupResult
	 * @param {function(Compiler, number, Callback<Stats>, function(): boolean, function(): void, function(): void): SetupResult} setup setup a single compiler
	 * @param {function(Compiler, Callback<Stats>): void} run run/continue a single compiler
	 * @param {Callback<MultiStats>} callback callback when all compilers are done, result includes Stats of all changed compilers
	 * @returns {SetupResult[]} result of setup
	 */
	_runGraph(setup, run, callback) {
		/** @typedef {{ compiler: Compiler, result: Stats, state: "pending" | "blocked" | "queued" | "running" | "running-outdated" | "done", children: Node[], parents: Node[] }} Node */

		// State transitions for nodes:
		// -> blocked (initial)
		// blocked -> queued [add to queue] (when all parents done)
		// queued -> running [running++] (when processing the queue)
		// running -> done [running--] (when compilation is done)
		// done -> pending (when invalidated from file change)
		// pending -> blocked (when invalidated from aggregated changes)
		// done -> blocked (when invalidated, from parent invalidation)
		// running -> running-outdated (when invalidated, either from change or parent invalidation)
		// running-outdated -> blocked [running--] (when compilation is done)

		/** @type {Node[]} */
		const nodes = this.compilers.map(compiler => ({
			compiler,
			result: undefined,
			state: "blocked",
			children: [],
			parents: []
		}));
		/** @type {Map<string, Node>} */
		const compilerToNode = new Map();
		for (const node of nodes) compilerToNode.set(node.compiler.name, node);
		for (const node of nodes) {
			const dependencies = this.dependencies.get(node.compiler);
			if (!dependencies) continue;
			for (const dep of dependencies) {
				const parent = compilerToNode.get(dep);
				node.parents.push(parent);
				parent.children.push(node);
			}
		}
		const queue = new ArrayQueue();
		for (const node of nodes) {
			if (node.parents.length === 0) {
				node.state = "queued";
				queue.enqueue(node);
			}
		}
		let errored = false;
		let running = 0;
		const parallelism = this._options.parallelism;
		/**
		 * @param {Node} node node
		 * @param {Error=} err error
		 * @param {Stats=} stats result
		 * @returns {void}
		 */
		const nodeDone = (node, err, stats) => {
			if (errored) return;
			if (err) {
				errored = true;
				return asyncLib.each(
					nodes,
					(node, callback) => {
						if (node.compiler.watching) {
							node.compiler.watching.close(callback);
						} else {
							callback();
						}
					},
					() => callback(err)
				);
			}
			node.result = stats;
			running--;
			if (node.state === "running") {
				node.state = "done";
				for (const child of node.children) {
					checkUnblocked(child);
				}
			} else if (node.state === "running-outdated") {
				node.state = "blocked";
				checkUnblocked(node);
			}
			process.nextTick(processQueue);
		};
		/**
		 * @param {Node} node node
		 * @returns {void}
		 */
		const nodeInvalidFromParent = node => {
			if (node.state === "done") {
				node.state = "blocked";
			} else if (node.state === "running") {
				node.state = "running-outdated";
			}
			for (const child of node.children) {
				nodeInvalidFromParent(child);
			}
		};
		/**
		 * @param {Node} node node
		 * @returns {void}
		 */
		const nodeInvalid = node => {
			if (node.state === "done") {
				node.state = "pending";
			} else if (node.state === "running") {
				node.state = "running-outdated";
			}
			for (const child of node.children) {
				nodeInvalidFromParent(child);
			}
		};
		/**
		 * @param {Node} node node
		 * @returns {void}
		 */
		const nodeChange = node => {
			nodeInvalid(node);
			if (node.state === "pending") {
				node.state = "blocked";
			}
			checkUnblocked(node);
			processQueue();
		};
		/**
		 * @param {Node} node node
		 * @returns {void}
		 */
		const checkUnblocked = node => {
			if (
				node.state === "blocked" &&
				node.parents.every(p => p.state === "done")
			) {
				node.state = "queued";
				queue.enqueue(node);
			}
		};

		const setupResults = [];
		nodes.forEach((node, i) => {
			setupResults.push(
				setup(
					node.compiler,
					i,
					nodeDone.bind(null, node),
					() => node.state !== "running",
					() => nodeChange(node),
					() => nodeInvalid(node)
				)
			);
		});
		const processQueue = () => {
			while (running < parallelism && queue.length > 0 && !errored) {
				const node = queue.dequeue();
				if (node.state !== "queued") continue;
				running++;
				node.state = "running";
				run(node.compiler, nodeDone.bind(null, node));
			}
			if (
				!errored &&
				running === 0 &&
				nodes.every(node => node.state === "done")
			) {
				const stats = [];
				for (const node of nodes) {
					const result = node.result;
					if (result) {
						node.result = undefined;
						stats.push(result);
					}
				}
				if (stats.length > 0) {
					callback(null, new MultiStats(stats));
				}
			}
		};
		processQueue();
		return setupResults;
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
		this.running = true;

		if (this.validateDependencies(handler)) {
			const watchings = this._runGraph(
				(compiler, idx, callback, isBlocked, setChanged, setInvalid) => {
					const watching = compiler.watch(
						Array.isArray(watchOptions) ? watchOptions[idx] : watchOptions,
						callback
					);
					if (watching) {
						watching._onInvalid = setInvalid;
						watching._onChange = setChanged;
						watching._isBlocked = isBlocked;
					}
					return watching;
				},
				(compiler, initial, callback) => {
					if (!compiler.watching.running) compiler.watching.invalidate();
				},
				handler
			);
			return new MultiWatching(watchings, this);
		}

		return new MultiWatching([], this);
	}

	/**
	 * @param {Callback<MultiStats>} callback signals when the call finishes
	 * @returns {void}
	 */
	run(callback) {
		if (this.running) {
			return callback(new ConcurrentCompilationError());
		}
		this.running = true;

		if (this.validateDependencies(callback)) {
			this._runGraph(
				() => {},
				(compiler, callback) => compiler.run(callback),
				(err, stats) => {
					this.running = false;

					if (callback !== undefined) {
						return callback(err, stats);
					}
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
