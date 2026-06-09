"use strict";

/** @typedef {(value: unknown) => void} Setter */
/** @typedef {{ setters: Setter[], execute: () => void }} ModuleInstance */
/** @typedef {{ meta: { url: string }, import: () => Promise<void> }} SystemContext */
/** @typedef {(dynamicExport: (result: unknown) => void, context: SystemContext) => ModuleInstance} RegisterFn */

/**
 * @typedef {object} ModuleEntry
 * @property {string=} name module name
 * @property {string[]=} deps dependency names
 * @property {RegisterFn=} fn register function
 * @property {ModuleInstance=} mod module instance returned by `fn`
 * @property {boolean} executed whether the module body has run
 * @property {unknown=} exports module exports
 */

const System = {
	/**
	 * @param {string | string[]} name module name (or deps for anonymous modules)
	 * @param {string[] | RegisterFn} deps dependency names (or register fn)
	 * @param {RegisterFn=} fn register function
	 * @returns {void}
	 */
	register: (name, deps, fn) => {
		if (!System.registry) {
			throw new Error("System is no initialized");
		}
		if (typeof name !== "string") {
			fn = /** @type {RegisterFn} */ (deps);
			deps = name;
			name = System._nextName;
		}
		if (!Array.isArray(deps)) {
			fn = deps;
			deps = [];
		}
		const moduleName = name;
		const dynamicExport = (/** @type {unknown} */ result) => {
			if (System.registry[moduleName] !== entry) {
				throw new Error(`Module ${moduleName} calls dynamicExport too late`);
			}
			entry.exports = result;
			for (const mod of Object.keys(System.registry)) {
				const m = System.registry[mod];
				if (!m.deps) continue;
				for (let i = 0; i < m.deps.length; i++) {
					const dep = m.deps[i];
					if (dep !== moduleName) continue;
					const setters = /** @type {ModuleInstance} */ (m.mod).setters[i];
					setters(result);
				}
			}
		};
		const systemContext = {
			meta: {
				url: `/${name}.js`
			},
			import() {
				return Promise.resolve();
			}
		};
		if (name in System.registry) {
			throw new Error(`Module ${name} is already registered`);
		}
		const mod = /** @type {RegisterFn} */ (fn)(dynamicExport, systemContext);
		if (deps.length > 0) {
			if (!Array.isArray(mod.setters)) {
				throw new Error(
					`Module ${name} must have setters, because it has dependencies`
				);
			}
			if (mod.setters.length !== deps.length) {
				throw new Error(
					`Module ${name} has incorrect number of setters for the dependencies`
				);
			}
		}
		/** @type {ModuleEntry} */
		const entry = {
			name,
			deps,
			fn,
			mod,
			executed: false,
			exports: undefined
		};
		System.registry[name] = entry;
	},
	/**
	 * @param {string} name module name
	 * @param {unknown} exports module exports
	 * @returns {void}
	 */
	set: (name, exports) => {
		System.registry[name] = {
			name,
			executed: true,
			exports
		};
	},
	// Starts uninitialized; `register` guards on `!System.registry` until `init`.
	registry:
		/** @type {Record<string, ModuleEntry>} */
		(/** @type {unknown} */ (undefined)),
	/** @type {((name: string) => void) | undefined} */
	_require: undefined,
	_nextName: "(anonym)",
	/**
	 * @param {(name: string) => void} req require implementation
	 * @returns {void}
	 */
	setRequire: (req) => {
		System._require = req;
	},
	/**
	 * @param {Record<string, unknown>=} modules preset modules
	 * @returns {void}
	 */
	init: (modules) => {
		System.registry = {};
		if (modules) {
			for (const name of Object.keys(modules)) {
				System.registry[name] = {
					executed: true,
					exports: modules[name]
				};
			}
		}
	},
	/**
	 * @param {string} name module name
	 * @returns {unknown} module exports
	 */
	execute: (name) => {
		const m = System.registry[name];
		if (!m) throw new Error(`Module ${name} not registered`);
		if (m.executed) throw new Error(`Module ${name} was already executed`);
		return System.ensureExecuted(name);
	},
	/**
	 * @param {string} name module name
	 * @returns {unknown} module exports
	 */
	ensureExecuted: (name) => {
		let m = System.registry[name];
		if (!m && System._require) {
			const oldName = System._nextName;
			System._nextName = name;
			System._require(name);
			System._nextName = oldName;
			m = System.registry[name];
		}
		if (!m) {
			throw new Error(`Module ${name} not registered`);
		}
		if (!m.executed) {
			m.executed = true;
			const deps = /** @type {string[]} */ (m.deps);
			const mod = /** @type {ModuleInstance} */ (m.mod);
			for (let i = 0; i < deps.length; i++) {
				const dep = deps[i];
				const setters = mod.setters[i];
				System.ensureExecuted(dep);
				const { exports } = System.registry[dep];
				if (exports !== undefined) setters(exports);
			}
			mod.execute();
		}
		return m.exports;
	}
};

module.exports = System;
