/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @import Dependency, { DependencyKinds } from "./Dependency" */

/**
 * Returns whether a dependency is of the given kind; use it wherever a plugin's dependency can reach.
 * A dependency extending another webpack copy's `Dependency` has no `is()` and is of no kind.
 * @template {keyof DependencyKinds} K
 * @param {Dependency} dependency a dependency
 * @param {K} kind a dependency kind
 * @returns {dependency is DependencyKinds[K]} true when the dependency is of that kind
 */
const isDependencyKind = (dependency, kind) =>
	// TODO in the next major release: remove, every dependency then has `is()`
	typeof dependency.is === "function" && dependency.is(kind);

module.exports = isDependencyKind;
