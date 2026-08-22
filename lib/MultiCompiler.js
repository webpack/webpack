/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const asyncLib = require("neo-async");
const { MultiHook, SyncHook } = require("tapable");

const MultiStats = require("./MultiStats");
const MultiWatching = require("./MultiWatching");
const WebpackError = require("./errors/WebpackError");
const ArrayQueue = require("./util/ArrayQueue");
const memoize = require("./util/memoize");

const getConcurrentCompilationError = memoize(() =>
	require("./errors/ConcurrentCompilationError")
);

/**
 * Defines the shared type used by this module.
 * @template T
 * @typedef {import("tapable").AsyncSeriesHook<T>} AsyncSeriesHook<T>
 */
/**
 * Defines the shared type used by this module.
 * @template T
 * @template R
 * @typedef {import("tapable").SyncBailHook<T, R>} SyncBailHook<T, R>
 */

/**
 * @import {
 * 	WebpackOptions,
 * 	WatchOptions
 * } from "../declarations/WebpackOptions"
 */
/** @import Compiler from "./Compiler" */
/**
 * Defines the callback type used by this module.
 * @template T
 * @template [R=void]
 * @typedef {import("./webpack").Callback<T, R>} Callback
 */
/** @import { ErrorCallback } from "./webpack" */
/** @import Stats from "./Stats" */
/** @import { Logger } from "./logging/Logger" */
/**
 * @import {
 * 	InputFileSystem,
 * 	IntermediateFileSystem,
 * 	OutputFileSystem,
 * 	WatchFileSystem
 * } from "./util/fs"
 */

/**
 * Defines the run with dependencies handler callback.
 * @callback RunWithDependenciesHandler
 * @param {Compiler} compiler
 * @param {Callback<MultiStats>} callback
 * @returns {void}
 */

/**
 * Defines the multi compiler options type used by this module.
 * @typedef {object} MultiCompilerOptions
 * @property {number=} parallelism how many Compilers are allows to run at the same time in parallel
 */

/** @typedef {ReadonlyArray<WebpackOptions> & MultiCompilerOptions} MultiWebpackOptions */

const CLASS_NAME = "MultiCompiler";

module.exports = class MultiCompiler {
	/**
	 * Creates an instance of MultiCompiler.
	 * @param {Compiler[] | Record<string, Compiler>} compilers child compilers
	 * @param {MultiCompilerOptions} options options
	 */
	constructor(compilers, options) {
		if (!Array.isArray(compilers)) {
			/** @type {Compiler[]} */
			compilers = Object.keys(compilers).map((name) => {
				/** @type {Record<string, Compiler>} */
				(compilers)[name].name = name;
				return /** @type {Record<string, Compiler>} */ (compilers)[name];
			});
		}

		this.hooks = Object.freeze({
			/** @type {SyncHook<[MultiStats, Compiler[]]>} */
			done: new SyncHook(["stats", "changedCompilers"]),
			/** @type {MultiHook<SyncHook<[string | null, number]>>} */
			invalid: new MultiHook(compilers.map((c) => c.hooks.invalid)),
			/** @type {MultiHook<AsyncSeriesHook<[Compiler]>>} */
			run: new MultiHook(compilers.map((c) => c.hooks.run)),
			/** @type {SyncHook<[]>} */
			watchClose: new SyncHook([]),
			/** @type {MultiHook<AsyncSeriesHook<[]>>} */
			shutdown: new MultiHook(compilers.map((c) => c.hooks.shutdown)),
			/** @type {MultiHook<AsyncSeriesHook<[Compiler]>>} */
			watchRun: new MultiHook(compilers.map((c) => c.hooks.watchRun)),
			/** @type {MultiHook<SyncBailHook<[string, string, EXPECTED_ANY[] | undefined], true | void>>} */
			infrastructureLog: new MultiHook(
				compilers.map((c) => c.hooks.infrastructureLog)
			)
		});
		/** @type {Compiler[]} */
		this.compilers = compilers;
		/** @type {MultiCompilerOptions} */
		this._options = {
			parallelism: options.parallelism || Infinity
		};
		/** @type {WeakMap<Compiler, string[]>} */
		this.dependencies = new WeakMap();
		/** @type {boolean} */
		this.running = false;
		/** @type {MultiWatching | undefined} */
		this.watching = undefined;

		/** @type {(Stats | null)[]} */
		const compilerStats = this.compilers.map(() => null);
		/** @type {Set<Compiler>} */
		const changedCompilers = new Set();
		let doneCompilers = 0;
		for (let index = 0; index < this.compilers.length; index++) {
			const compiler = this.compilers[index];
			const compilerIndex = index;
			let compilerDone = false;
			// eslint-disable-next-line no-loop-func
			compiler.hooks.done.tap(CLASS_NAME, (stats) => {
				changedCompilers.add(compiler);
				if (!compilerDone) {
					compilerDone = true;
					doneCompilers++;
				}
				compilerStats[compilerIndex] = stats;
				if (doneCompilers === this.compilers.length) {
					const changed = this.compilers.filter((c) => changedCompilers.has(c));
					changedCompilers.clear();
					this.hooks.done.call(
						// Copy: the live array is cleared per child on shutdown.
						new MultiStats(/** @type {Stats[]} */ ([...compilerStats])),
						changed
					);
				}
			});
			// Each entry holds a Stats -> Compilation; don't outlive the child's close().
			compiler.hooks.shutdown.tap(CLASS_NAME, () => {
				compilerStats[compilerIndex] = null;
			});
			// eslint-disable-next-line no-loop-func
			compiler.hooks.invalid.tap(CLASS_NAME, () => {
				if (compilerDone) {
					compilerDone = false;
					doneCompilers--;
				}
			});
			// Release fields on this child's Compilation once it's done. The
			// stage: Infinity tap runs after every afterDone tap at a lower
			// stage, so plugins observing compilation state in afterDone still
			// see it intact. Stats remains usable; only fields Stats never reads
			// (and that the persistent cache never serializes) are dropped.

			compiler.hooks.afterDone.tap(
				{ name: CLASS_NAME, stage: Infinity },
				(stats) => {
					if (stats !== undefined) {
						compiler._releaseUnusedCompilationData(stats.compilation);
					}
				}
			);
		}
		this._validateCompilersOptions();
	}

	_validateCompilersOptions() {
		if (this.compilers.length < 2) return;
		/**
		 * Adds the provided compiler to the multi compiler.
		 * @param {Compiler} compiler compiler
		 * @param {WebpackError} warning warning
		 */
		const addWarning = (compiler, warning) => {
			compiler.hooks.thisCompilation.tap(CLASS_NAME, (compilation) => {
				compilation.warnings.push(warning);
			});
		};
		/** @type {Set<string>} */
		const cacheNames = new Set();
		for (const compiler of this.compilers) {
			if (compiler.options.cache && "name" in compiler.options.cache) {
				const name = /** @type {string} */ (compiler.options.cache.name);
				if (cacheNames.has(name)) {
					addWarning(
						compiler,
						new WebpackError(
							`${
								compiler.name
									? `Compiler with name "${compiler.name}" doesn't use unique cache name. `
									: ""
							}Please set unique "cache.name" option. Name "${name}" already used.`
						)
					);
				} else {
					cacheNames.add(name);
				}
			}
		}
	}

	get options() {
		return Object.assign(
			this.compilers.map((c) => c.options),
			this._options
		);
	}

	get outputPath() {
		// Match whole path segments: "/dist-app" must not count as inside "/dist"
		/**
		 * @param {string} parent candidate ancestor path
		 * @param {string} path path to test
		 * @returns {boolean} true when path is parent or inside it
		 */
		const isSubPath = (parent, path) => {
			if (path === parent) return true;
			if (!path.startsWith(parent)) return false;
			const next = path.charCodeAt(parent.length);
			return next === 47 || next === 92 || /[/\\]$/.test(parent);
		};
		let commonPath = this.compilers[0].outputPath;
		for (const compiler of this.compilers) {
			while (
				!isSubPath(commonPath, compiler.outputPath) &&
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

	/**
	 * Sets input file system.
	 * @param {InputFileSystem} value the new input file system
	 */
	set inputFileSystem(value) {
		for (const compiler of this.compilers) {
			compiler.inputFileSystem = value;
		}
	}

	get outputFileSystem() {
		throw new Error("Cannot read outputFileSystem of a MultiCompiler");
	}

	/**
	 * Sets output file system.
	 * @param {OutputFileSystem} value the new output file system
	 */
	set outputFileSystem(value) {
		for (const compiler of this.compilers) {
			compiler.outputFileSystem = value;
		}
	}

	get watchFileSystem() {
		throw new Error("Cannot read watchFileSystem of a MultiCompiler");
	}

	/**
	 * Sets watch file system.
	 * @param {WatchFileSystem} value the new watch file system
	 */
	set watchFileSystem(value) {
		for (const compiler of this.compilers) {
			compiler.watchFileSystem = value;
		}
	}

	/**
	 * Sets intermediate file system.
	 * @param {IntermediateFileSystem} value the new intermediate file system
	 */
	set intermediateFileSystem(value) {
		for (const compiler of this.compilers) {
			compiler.intermediateFileSystem = value;
		}
	}

	get intermediateFileSystem() {
		throw new Error("Cannot read outputFileSystem of a MultiCompiler");
	}

	/**
	 * Gets infrastructure logger.
	 * @param {string | (() => string)} name name of the logger, or function called once to get the logger name
	 * @returns {Logger} a logger with that name
	 */
	getInfrastructureLogger(name) {
		return this.compilers[0].getInfrastructureLogger(name);
	}

	/**
	 * Updates dependencies using the provided compiler.
	 * @param {Compiler} compiler the child compiler
	 * @param {string[]} dependencies its dependencies
	 * @returns {void}
	 */
	setDependencies(compiler, dependencies) {
		this.dependencies.set(compiler, dependencies);
	}

	/**
	 * Validate dependencies.
	 * @param {Callback<MultiStats>} callback signals when the validation is complete
	 * @returns {boolean} true if the dependencies are valid
	 */
	validateDependencies(callback) {
		/** @type {Set<{ source: Compiler, target: Compiler }>} */
		const edges = new Set();
		/** @type {string[]} */
		const missing = [];
		/**
		 * Returns target was found.
		 * @param {Compiler} compiler compiler
		 * @returns {boolean} target was found
		 */
		const targetFound = (compiler) => {
			for (const edge of edges) {
				if (edge.target === compiler) {
					return true;
				}
			}
			return false;
		};
		/**
		 * Returns result.
		 * @param {{ source: Compiler, target: Compiler }} e1 edge 1
		 * @param {{ source: Compiler, target: Compiler }} e2 edge 2
		 * @returns {number} result
		 */
		const sortEdges = (e1, e2) =>
			/** @type {string} */
			(e1.source.name).localeCompare(/** @type {string} */ (e2.source.name)) ||
			/** @type {string} */
			(e1.target.name).localeCompare(/** @type {string} */ (e2.target.name));
		for (const source of this.compilers) {
			const dependencies = this.dependencies.get(source);
			if (dependencies) {
				for (const dep of dependencies) {
					const target = this.compilers.find((c) => c.name === dep);
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
		const errors = missing.map(
			(m) => `Compiler dependency \`${m}\` not found.`
		);
		const stack = this.compilers.filter((c) => !targetFound(c));
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
			const lines = [...edges]
				.sort(sortEdges)
				.map((edge) => `${edge.source.name} -> ${edge.target.name}`);
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
	 * Run with dependencies.
	 * @deprecated This method should have been private
	 * @param {Compiler[]} compilers the child compilers
	 * @param {RunWithDependenciesHandler} fn a handler to run for each compiler
	 * @param {Callback<Stats[]>} callback the compiler's handler
	 * @returns {void}
	 */
	runWithDependencies(compilers, fn, callback) {
		/** @type {Set<string>} */
		const fulfilledNames = new Set();
		let remainingCompilers = compilers;
		/**
		 * Checks whether this multi compiler is dependency fulfilled.
		 * @param {string} d dependency
		 * @returns {boolean} when dependency was fulfilled
		 */
		const isDependencyFulfilled = (d) => fulfilledNames.has(d);
		/**
		 * Gets ready compilers.
		 * @returns {Compiler[]} compilers
		 */
		const getReadyCompilers = () => {
			/** @type {Compiler[]} */
			const readyCompilers = [];
			const list = remainingCompilers;
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
		/**
		 * Processes the provided stat.
		 * @param {Callback<Stats[]>} callback callback
		 * @returns {void}
		 */
		const runCompilers = (callback) => {
			if (remainingCompilers.length === 0) return callback(null);
			asyncLib.map(
				getReadyCompilers(),
				(compiler, callback) => {
					fn(compiler, (err) => {
						if (err) return callback(err);
						fulfilledNames.add(/** @type {string} */ (compiler.name));
						runCompilers(callback);
					});
				},
				(err, results) => {
					callback(/** @type {Error | null} */ (err), results);
				}
			);
		};
		runCompilers(callback);
	}

	/**
	 * Returns result of setup.
	 * @template SetupResult
	 * @param {(compiler: Compiler, index: number, doneCallback: Callback<Stats>, isBlocked: () => boolean, setChanged: () => void, setInvalid: () => void) => SetupResult} setup setup a single compiler
	 * @param {(compiler: Compiler, setupResult: SetupResult, callback: Callback<Stats>) => void} run run/continue a single compiler
	 * @param {Callback<MultiStats>} callback callback when all compilers are done, result includes Stats of all changed compilers
	 * @returns {SetupResult[]} result of setup
	 */
	_runGraph(setup, run, callback) {
		/** @typedef {{ compiler: Compiler, setupResult: undefined | SetupResult, result: undefined | Stats, state: "pending" | "blocked" | "queued" | "starting" | "running" | "running-outdated" | "done", children: Node[], parents: Node[] }} Node */

		// State transitions for nodes:
		// -> blocked (initial)
		// blocked -> starting [running++] (when all parents done)
		// queued -> starting [running++] (when processing the queue)
		// starting -> running (when run has been called)
		// running -> done [running--] (when compilation is done)
		// done -> pending (when invalidated from file change)
		// pending -> blocked [add to queue] (when invalidated from aggregated changes)
		// done -> blocked [add to queue] (when invalidated, from parent invalidation)
		// running -> running-outdated (when invalidated, either from change or parent invalidation)
		// running-outdated -> blocked [running--] (when compilation is done)

		/** @type {Node[]} */
		const nodes = this.compilers.map((compiler) => ({
			compiler,
			setupResult: undefined,
			result: undefined,
			state: "blocked",
			children: [],
			parents: []
		}));
		/** @type {Map<string, Node>} */
		const compilerToNode = new Map();
		for (const node of nodes) {
			compilerToNode.set(/** @type {string} */ (node.compiler.name), node);
		}
		for (const node of nodes) {
			const dependencies = this.dependencies.get(node.compiler);
			if (!dependencies) continue;
			for (const dep of dependencies) {
				const parent = /** @type {Node} */ (compilerToNode.get(dep));
				node.parents.push(parent);
				parent.children.push(node);
			}
		}
		/** @type {ArrayQueue<Node>} */
		const queue = new ArrayQueue();
		for (const node of nodes) {
			if (node.parents.length === 0) {
				node.state = "queued";
				queue.enqueue(node);
			}
		}
		let errored = false;
		let running = 0;
		let duringSetup = true;
		/** @type {Error | null} */
		let setupError = null;
		const parallelism = /** @type {number} */ (this._options.parallelism);
		/**
		 * Closes all node watchings.
		 * @param {() => void} onClosed called when every watching is closed
		 * @returns {void}
		 */
		const closeWatchings = (onClosed) => {
			asyncLib.each(
				nodes,
				(node, callback) => {
					if (node.compiler.watching) {
						node.compiler.watching.close(callback);
					} else {
						callback();
					}
				},
				onClosed
			);
		};
		/**
		 * Processes the provided node.
		 * @param {Node} node node
		 * @param {(Error | null)=} err error
		 * @param {Stats=} stats result
		 * @returns {void}
		 */
		const nodeDone = (node, err, stats) => {
			if (errored) return;
			if (err) {
				errored = true;
				// During setup later watchings do not exist yet — defer the close
				// sweep until the setup loop created them all, or they would leak
				if (duringSetup) {
					setupError = err;
					return;
				}
				return closeWatchings(() => callback(err));
			}
			node.result = stats;
			running--;
			if (node.state === "running") {
				node.state = "done";
				for (const child of node.children) {
					if (child.state === "blocked") queue.enqueue(child);
				}
			} else if (node.state === "running-outdated") {
				node.state = "blocked";
				queue.enqueue(node);
			}
			processQueue();
		};
		/**
		 * Node invalid from parent.
		 * @param {Node} node node
		 * @returns {void}
		 */
		const nodeInvalidFromParent = (node) => {
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
		 * Processes the provided node.
		 * @param {Node} node node
		 * @returns {void}
		 */
		const nodeInvalid = (node) => {
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
		 * Processes the provided node.
		 * @param {Node} node node
		 * @returns {void}
		 */
		const nodeChange = (node) => {
			nodeInvalid(node);
			if (node.state === "pending") {
				node.state = "blocked";
			}
			if (node.state === "blocked") {
				queue.enqueue(node);
				processQueue();
			}
		};

		/** @type {SetupResult[]} */
		const setupResults = [];
		for (const [i, node] of nodes.entries()) {
			setupResults.push(
				(node.setupResult = setup(
					node.compiler,
					i,
					nodeDone.bind(null, node),
					() => node.state !== "starting" && node.state !== "running",
					() => nodeChange(node),
					() => nodeInvalid(node)
				))
			);
		}
		let processing = true;
		const processQueue = () => {
			if (processing) return;
			processing = true;
			process.nextTick(processQueueWorker);
		};
		const processQueueWorker = () => {
			// eslint-disable-next-line no-unmodified-loop-condition
			while (running < parallelism && queue.length > 0 && !errored) {
				const node = /** @type {Node} */ (queue.dequeue());
				if (
					node.state === "queued" ||
					(node.state === "blocked" &&
						node.parents.every((p) => p.state === "done"))
				) {
					running++;
					node.state = "starting";
					run(
						node.compiler,
						/** @type {SetupResult} */ (node.setupResult),
						nodeDone.bind(null, node)
					);
					node.state = "running";
				}
			}
			processing = false;
			if (
				!errored &&
				running === 0 &&
				nodes.every((node) => node.state === "done")
			) {
				/** @type {Stats[]} */
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
		duringSetup = false;
		if (setupError) {
			// The setup loop finished, every watching exists now — safe to sweep
			const err = setupError;
			closeWatchings(() => callback(err));
		} else {
			processQueueWorker();
		}
		return setupResults;
	}

	/**
	 * Returns a compiler watcher.
	 * @param {WatchOptions | WatchOptions[]} watchOptions the watcher's options
	 * @param {Callback<MultiStats>} handler signals when the call finishes
	 * @returns {MultiWatching | undefined} a compiler watcher
	 */
	watch(watchOptions, handler) {
		if (this.running) {
			handler(new (getConcurrentCompilationError())());
			return;
		}
		// Only mark as running after validation, so a retry reports the real error
		if (!this.validateDependencies(handler)) {
			this.watching = new MultiWatching([], this);
			return this.watching;
		}
		this.running = true;

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
			(compiler, watching, _callback) => {
				if (compiler.watching !== watching) return;
				if (!watching.running) watching.invalidate();
			},
			(err, stats) => {
				// A fatal error tears the whole graph down — allow watching again
				if (err) this.running = false;
				handler(err, stats);
			}
		);
		this.watching = new MultiWatching(watchings, this);
		return this.watching;
	}

	/**
	 * Processes the provided multi stat.
	 * @param {Callback<MultiStats>} callback signals when the call finishes
	 * @returns {void}
	 */
	run(callback) {
		if (this.running) {
			callback(new (getConcurrentCompilationError())());
			return;
		}
		// Only mark as running after validation, so a retry reports the real error
		if (!this.validateDependencies(callback)) return;
		this.running = true;

		this._runGraph(
			() => {},
			(compiler, setupResult, callback) => compiler.run(callback),
			(err, stats) => {
				this.running = false;

				if (callback !== undefined) {
					return callback(err, stats);
				}
			}
		);
	}

	purgeInputFileSystem() {
		for (const compiler of this.compilers) {
			if (compiler.inputFileSystem && compiler.inputFileSystem.purge) {
				compiler.inputFileSystem.purge();
			}
		}
	}

	/**
	 * Processes the provided error callback.
	 * @param {ErrorCallback} callback signals when the compiler closes
	 * @returns {void}
	 */
	close(callback) {
		if (this.watching) {
			// When there is still an active watching, close this first
			this.watching.close((_err) => {
				this.close(callback);
			});
			return;
		}
		asyncLib.each(
			this.compilers,
			(compiler, callback) => {
				compiler.close(callback);
			},
			(error) => {
				callback(/** @type {Error | null} */ (error));
			}
		);
	}
};
