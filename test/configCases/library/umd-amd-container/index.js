const fs = require("fs");
const vm = require("vm");

const external = require("my-external");

const source = () => fs.readFileSync(__filename, "utf-8");

// the UMD wrapper is everything in front of the factory
const wrapper = () => source().slice(0, source().indexOf("{\nreturn "));

// runs the emitted bundle in a fresh context, `it`/`expect` are stubbed there
const runInContext = (sandbox) => {
	sandbox.it = () => {};
	sandbox.expect = () => ({ toBe() {}, toEqual() {}, toContain() {} });
	sandbox.require = __non_webpack_require__;
	sandbox.global = sandbox;
	sandbox.self = sandbox;
	sandbox.window = sandbox;
	vm.runInNewContext(source(), sandbox);
	return sandbox;
};

it("should emit a define branch guarding every step of the container path", () => {
	expect(wrapper()).toContain(
		"else if(typeof sap !== 'undefined' && sap.ui && typeof sap.ui.define === 'function')"
	);
	expect(wrapper()).toContain(
		'sap.ui.define("MyLibrary", ["my/external"], factory)'
	);
});

it("should export via the container when its loader is present", () => {
	let name;
	let dependencies;
	let factory;
	const sandbox = runInContext({
		sap: {
			ui: {
				define(_name, _dependencies, _factory) {
					name = _name;
					dependencies = _dependencies;
					factory = _factory;
				}
			}
		}
	});
	expect(name).toBe("MyLibrary");
	expect(dependencies).toEqual(["my/external"]);
	expect(factory(external).answer).toBe(42);
	expect(sandbox.MyLibrary).toBe(undefined);
});

it("should export to the global when the container is absent", () => {
	const sandbox = runInContext({ MyExternal: external });
	expect(sandbox.MyLibrary.answer).toBe(42);
});

it("should export to the global when the container path is incomplete", () => {
	const sandbox = runInContext({ MyExternal: external, sap: {} });
	expect(sandbox.MyLibrary.answer).toBe(42);
});

it("should keep the external usable", () => {
	expect(typeof external.join).toBe("function");
});

export const answer = 42;
