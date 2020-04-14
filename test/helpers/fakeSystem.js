const System = {
	register: (name, deps, fn) => {
		if (!System.registry) {
			throw new Error("System is no initialized");
		}
		if (typeof name !== "string") {
			fn = deps;
			deps = name;
			name = System._nextName;
		}
		if (!Array.isArray(deps)) {
			fn = deps;
			deps = [];
		}
		const dynamicExport = result => {
			if (System.registry[name] !== entry) {
				throw new Error(`Module ${name} calls dynamicExport too late`);
			}
			entry.exports = result;
			for (const mod of Object.keys(System.registry)) {
				const m = System.registry[mod];
				if (!m.deps) continue;
				for (let i = 0; i < m.deps.length; i++) {
					const dep = m.deps[i];
					if (dep !== name) continue;
					const setters = m.mod.setters[i];
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
		const mod = fn(dynamicExport, systemContext);
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
	set: (name, exports) => {
		System.registry[name] = {
			name,
			executed: true,
			exports
		};
	},
	registry: undefined,
	_require: undefined,
	_nextName: "(anonym)",
	setRequire: req => {
		System._require = req;
	},
	init: modules => {
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
	execute: name => {
		const m = System.registry[name];
		if (!m) throw new Error(`Module ${name} not registered`);
		if (m.executed) throw new Error(`Module ${name} was already executed`);
		return System.ensureExecuted(name);
	},
	ensureExecuted: name => {
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
			for (let i = 0; i < m.deps.length; i++) {
				const dep = m.deps[i];
				const setters = m.mod.setters[i];
				System.ensureExecuted(dep);
				const { exports } = System.registry[dep];
				if (exports !== undefined) setters(exports);
			}
			m.mod.execute();
		}
		return m.exports;
	}
};
module.exports = System;
