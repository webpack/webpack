"use strict";

/** @typedef {(...args: unknown[]) => unknown} Handler */
/** @typedef {{ tap: (options: unknown, handler: Handler) => void, tapAsync: (options: unknown, handler: Handler) => void, tapPromise: (options: unknown, handler: Handler) => void }} FakeHook */

module.exports = function PluginEnvironment() {
	/**
	 * @type {{ name: string, handler: Handler }[]}
	 */
	const events = [];

	/**
	 * @param {string} name the name
	 * @param {Handler} handler the handler
	 */
	function addEvent(name, handler) {
		events.push({
			name,
			handler
		});
	}

	/**
	 * @param {string} hookName a hook name
	 * @returns {string} an event name
	 */
	function getEventName(hookName) {
		// Convert a hook name to an event name.
		// e.g. `buildModule` -> `build-module`
		return hookName.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
	}

	this.getEnvironmentStub = function getEnvironmentStub() {
		/** @type {Map<string | symbol, FakeHook>} */
		const hooks = new Map();
		return {
			plugin: addEvent,
			// TODO: Figure out a better way of doing this
			// In the meanwhile, `hooks` is a `Proxy` which creates fake hooks
			// on demand. Instead of creating a dummy object with a few `Hook`
			// method, a custom `Hook` class could be used.
			hooks: new Proxy(
				{},
				{
					get(target, hookName) {
						let hook = hooks.get(hookName);
						if (hook === undefined) {
							const eventName = getEventName(/** @type {string} */ (hookName));
							hook = {
								tap(options, handler) {
									addEvent(eventName, handler);
								},
								tapAsync(options, handler) {
									addEvent(eventName, handler);
								},
								tapPromise(options, handler) {
									addEvent(eventName, handler);
								}
							};
							hooks.set(hookName, hook);
						}
						return hook;
					}
				}
			)
		};
	};

	this.getEventBindings = function getEventBindings() {
		return events;
	};
};
