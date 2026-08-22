/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { SyncHook } = require("tapable");
const createHooksRegistry = require("../util/createHooksRegistry");

/** @import Dependency from "../Dependency" */

const createCompilationHooks = () => ({
	/**
	 * @type {SyncHook<Dependency>}
	 * @since 5.96.0
	 */
	addContainerEntryDependency: new SyncHook(["dependency"]),
	/**
	 * @type {SyncHook<Dependency>}
	 * @since 5.96.0
	 */
	addFederationRuntimeDependency: new SyncHook(["dependency"])
});

/** @typedef {ReturnType<typeof createCompilationHooks>} CompilationHooks */

// lives outside `ModuleFederationPlugin` so the plugins it applies can read the
// hooks without requiring it back
const getCompilationHooks = createHooksRegistry(createCompilationHooks);

module.exports = getCompilationHooks;
