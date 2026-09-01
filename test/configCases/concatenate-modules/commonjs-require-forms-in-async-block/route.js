// The require forms whose dependency renders in an async block while the
// `require`/`require.resolve` callee it sits in is a presentational dependency
// of the module, so the two are applied out of source order.
import { value as sharedFromImport } from "./shared";

export function loadDestructured() {
	return new Promise((resolve) => {
		require.ensure(
			[],
			(require) => {
				const { first, second } = require("./destructured");
				resolve([first, second]);
			},
			"destructured"
		);
	});
}

export function loadCalled() {
	return new Promise((resolve) => {
		require.ensure(
			[],
			(require) => {
				resolve(require("./callable")());
			},
			"called"
		);
	});
}

export function loadConditional(useA) {
	return new Promise((resolve) => {
		require.ensure(
			[],
			(require) => {
				resolve(require(useA ? "./branch-a" : "./branch-b").value);
			},
			"conditional"
		);
	});
}

export function loadResolved() {
	return new Promise((resolve) => {
		require.ensure(
			[],
			(require) => {
				const id = require.resolve("./resolved");
				resolve([id, require("./resolved").value]);
			},
			"resolved"
		);
	});
}

export function loadAlsoImported() {
	return new Promise((resolve) => {
		require.ensure(
			[],
			(require) => {
				resolve([sharedFromImport, require("./shared").value]);
			},
			"also-imported"
		);
	});
}
