module.exports = function PluginEnvironment() {
	const events = [];

	function addEvent(name, handler) {
		events.push({
			name,
			handler
		});
	}

	function getEventName(hookName) {
		// Convert a hook name to an event name.
		// e.g. `buildModule` -> `build-module`
		return hookName.replace(/[A-Z]/g, c => "-" + c.toLowerCase());
	}

	this.getEnvironmentStub = function () {
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
							const eventName = getEventName(hookName);
							hook = {
								tap(_, handler) {
									addEvent(eventName, handler);
								},
								tapAsync(_, handler) {
									addEvent(eventName, handler);
								},
								tapPromise(_, handler) {
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

	this.getEventBindings = function () {
		return events;
	};
};
