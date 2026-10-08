// Every require() below sits in an async block, so its dependency renders after
// the module's presentational ones — the order that leaked a reference in #21903.

export function loadNamespace() {
	return new Promise((resolve) => {
		require.ensure(
			[],
			(require) => {
				const whole = require("./esm");
				resolve([whole.NAME, whole.default]);
			},
			"namespace"
		);
	});
}

export function loadMember() {
	return new Promise((resolve) => {
		require.ensure(
			[],
			(require) => {
				resolve(require("./esm").NAME);
			},
			"member"
		);
	});
}

export function loadConstructed() {
	return new Promise((resolve) => {
		require.ensure(
			[],
			(require) => {
				// `new require(id)` passes an object module.exports through unchanged
				const constructed = new require("./object-exports");
				resolve(constructed.value);
			},
			"constructed"
		);
	});
}

export function loadCommonJs() {
	return new Promise((resolve) => {
		require.ensure(
			[],
			(require) => {
				const cjs = require("./cjs");
				resolve(cjs.value);
			},
			"cjs"
		);
	});
}

export function loadNested() {
	return new Promise((resolve) => {
		require.ensure(
			[],
			(require) => {
				require.ensure(
					[],
					(require) => {
						const nested = require("./nested");
						resolve(nested.value);
					},
					"nested-inner"
				);
			},
			"nested-outer"
		);
	});
}

export function loadAmd() {
	return new Promise((resolve) => {
		require(["./amd-dep"], (amdDep) => {
			const target = require("./amd-target");
			resolve([amdDep.value, target.value]);
		});
	});
}
