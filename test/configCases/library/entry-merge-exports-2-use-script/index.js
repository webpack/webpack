const fs = require("fs");
const path = require("path");
const vm = require("vm");

const NAME = "MergedLib";

// A script-style library hands the merged object to something the page owns
// rather than to a module system, so each is read back through its own shim.
const READERS = {
	global: (code) => {
		const sandbox = {};
		sandbox.globalThis = sandbox;
		sandbox.window = sandbox;
		sandbox.self = sandbox;
		sandbox.global = sandbox;
		vm.runInNewContext(code, sandbox);
		return sandbox[NAME];
	},
	amd: (code) => {
		let exported;
		const define = (...args) => {
			const factory = args[args.length - 1];
			exported = typeof factory === "function" ? factory() : factory;
		};
		define.amd = true;
		vm.runInNewContext(code, { define });
		return exported;
	},
	amdRequire: (code) => {
		let exported;
		vm.runInNewContext(code, {
			require: (dependencies, factory) => {
				exported = factory();
			}
		});
		return exported;
	},
	jsonp: (code) => {
		let exported;
		vm.runInNewContext(code, {
			[NAME]: (value) => {
				exported = value;
			}
		});
		return exported;
	},
	system: (code) => {
		const exported = {};
		vm.runInNewContext(code, {
			System: {
				register: (name, dependencies, body) => {
					body((key, value) => {
						if (typeof key === "object") Object.assign(exported, key);
						else exported[key] = value;
					}, {}).execute();
				}
			}
		});
		return exported;
	}
};

const TYPES = [
	["var", "global"],
	["assign", "global"],
	["assign-properties", "global"],
	["this", "global"],
	["window", "global"],
	["self", "global"],
	["global", "global"],
	["jsonp", "jsonp"],
	["system", "system"],
	["amd", "amd"],
	["amd-require", "amdRequire"]
];

for (const [type, reader] of TYPES) {
	it(`should expose the merged exports to a ${type} library`, () => {
		const code = fs.readFileSync(
			path.resolve(__dirname, `../entry-merge-exports-0-create/${type}.js`),
			"utf8"
		);
		const exported = READERS[reader](code);
		expect(exported.fromA).toBe("a");
		expect(exported.fromB).toBe("b");
		expect(exported.fromBoth).toBe("both");
		expect(Object.keys(exported)).not.toContain("shared");
	});
}
