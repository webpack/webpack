"use strict";

module.exports = function PluginEnvironment() {
	var events = [];

	this.getEnvironmentStub = function() {
		return {
			plugin: function(name, handler, opts) {
				if(handler.path) {
					const handlerPath = handler.path;
					const fnName = handler.fnName;
					events.push({
						name,
						handler: function() { // this is called in tests via call, and a passed context
							const args = Array.prototype.slice.call(arguments);
							args.push(opts, this);
							require(handlerPath)[fnName].apply(null, args);
						},
					});
				} else {
					events.push({
						name,
						handler
					});
				}
			}
		};
	};

	this.getEventBindings = function() {
		return events;
	};
};
