"use strict";

// Bun-only jest preloader (loaded via `bun --preload` from the bun test script).
//
// jest cannot start under Bun because Bun's `node:` built-ins expose different
// property descriptors than Node. jest-runtime builds a mocked module class as,
// roughly:
//
//   class Mock extends require("node:module").Module {}
//   for (const [key, value] of Object.entries(Module)) Mock[key] = value;
//
// On Node `Module.prototype` is non-enumerable, so the copy loop skips it. On
// Bun it is enumerable, so the loop reaches `Mock.prototype = value`, which
// always throws ("Attempted to assign to readonly property" — a class's
// `prototype` is read-only). Bun also exposes a few statics (`_resolveFilename`,
// `runMain`, `wrapper`) as getter-only accessors, which throw the same way.
//
// Realign those descriptors with Node so the copy loop succeeds.

const nodeModule = require("node:module");
const nodeVm = require("node:vm");

// Pure-JS `vm.SyntheticModule` stand-in: Bun segfaults when jest drives the
// native one through link/evaluate inside the jest environment context.
class BunSyntheticModule {
	constructor(exportNames, evaluationCallback, options = {}) {
		this.identifier = options.identifier || "";
		this.context = options.context;
		this.status = "unlinked";
		this.error = undefined;
		this._exportNames = new Set(exportNames);
		this._evaluationCallback = evaluationCallback;
		this._namespace = Object.create(null);
		Object.defineProperty(this._namespace, Symbol.toStringTag, {
			value: "Module"
		});
	}

	setExport(name, value) {
		if (!this._exportNames.has(name)) {
			throw new ReferenceError(`Export '${name}' is not defined in module`);
		}
		this._namespace[name] = value;
	}

	get namespace() {
		return this._namespace;
	}

	async link() {
		if (this.status === "unlinked") this.status = "linked";
	}

	async evaluate() {
		if (this.status !== "linked") return;
		try {
			this._evaluationCallback();
			this.status = "evaluated";
		} catch (err) {
			this.status = "errored";
			this.error = err;
			throw err;
		}
	}
}
const OriginalSyntheticModule = nodeVm.SyntheticModule;
// Only jest-runtime wrappers get the stand-in; other creators (the ESM test
// harness) link into native SourceTextModule graphs and need a real instance.
nodeVm.SyntheticModule = function SyntheticModule(
	exportNames,
	evaluationCallback,
	options
) {
	return new Error("caller probe").stack.includes("jest-runtime")
		? new BunSyntheticModule(exportNames, evaluationCallback, options)
		: new OriginalSyntheticModule(exportNames, evaluationCallback, options);
};

// Bun resolves an `importModuleDynamically` result that is a module object to
// an empty namespace; coerce to `.namespace` wherever jest installs a callback.
const toNamespace = (mod) =>
	(nodeVm.Module && mod instanceof nodeVm.Module) ||
	mod instanceof BunSyntheticModule
		? mod.namespace
		: mod;
const wrapDynamicImport = (options) => {
	if (!options || typeof options.importModuleDynamically !== "function") {
		return options;
	}
	const original = options.importModuleDynamically;
	return {
		...options,
		importModuleDynamically(...args) {
			const result = original.apply(this, args);
			return result && typeof result.then === "function"
				? result.then(toNamespace)
				: toNamespace(result);
		}
	};
};
const originalCompileFunction = nodeVm.compileFunction;
nodeVm.compileFunction = function compileFunction(code, params, options) {
	return originalCompileFunction.call(
		this,
		code,
		params,
		wrapDynamicImport(options)
	);
};
if (nodeVm.SourceTextModule) {
	const OriginalSourceTextModule = nodeVm.SourceTextModule;
	nodeVm.SourceTextModule = class SourceTextModule extends (
		OriginalSourceTextModule
	) {
		constructor(code, options) {
			super(code, wrapDynamicImport(options));
		}
	};
}

// Bun's native `fs.watch` does not deliver change events reliably under jest's
// worker threads, so watchpack misses edits and the WatchTestCases hang or read
// stale output. Force watchpack into polling mode (honored unless already set).
if (!process.env.WATCHPACK_POLLING) process.env.WATCHPACK_POLLING = "100";

// Statics Node keeps non-enumerable; hide them so `Object.entries` skips them.
const HIDDEN = new Set(["prototype", "length", "name", "arguments", "caller"]);

const align = (target) => {
	if (!target) return;
	for (const key of Object.getOwnPropertyNames(target)) {
		const d = Object.getOwnPropertyDescriptor(target, key);
		if (!d || !d.configurable) continue;
		if (HIDDEN.has(key)) {
			if (d.enumerable) {
				d.enumerable = false;
				Object.defineProperty(target, key, d);
			}
		} else if (d.get || d.set) {
			let value;
			try {
				value = d.get ? d.get.call(target) : undefined;
			} catch {
				value = undefined;
			}
			Object.defineProperty(target, key, {
				value,
				writable: true,
				enumerable: d.enumerable,
				configurable: true
			});
		} else if (d.writable === false) {
			d.writable = true;
			Object.defineProperty(target, key, d);
		}
	}
};

align(nodeModule.Module);

// Bun's stream reader/writer `.closed`/`.ready` getters return a *rejected*
// promise (not a sync throw) when read off the prototype. jest's globals cleanup
// reads every global getter during env setup, so those rejections surface as
// unhandled and fail tests. Attach a no-op catch so they are never "unhandled";
// real instances still return the original promise to their consumers.
for (const [name, keys] of [
	["ReadableStreamDefaultReader", ["closed"]],
	["ReadableStreamBYOBReader", ["closed"]],
	["WritableStreamDefaultWriter", ["closed", "ready"]]
]) {
	const ctor = globalThis[name];
	if (!ctor || !ctor.prototype) continue;
	for (const key of keys) {
		const descriptor = Object.getOwnPropertyDescriptor(ctor.prototype, key);
		if (!descriptor || !descriptor.get) continue;
		const original = descriptor.get;
		Object.defineProperty(ctor.prototype, key, {
			configurable: true,
			enumerable: descriptor.enumerable,
			get() {
				const value = original.call(this);
				if (value && typeof value.then === "function") {
					value.catch(() => {});
				}
				return value;
			}
		});
	}
}
