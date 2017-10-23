"use strict";

/**
 * Work around to instantiate modules w/ the *new* keyword.
 * @param {class} Cls - a class that needs to be instantiated.
 * @param {array} args - array of arguments to instantiate the class with.
 * @returns {any} - an instance of the passed Class definition.
 */
function newCall(Cls, args) {
	var f = Function.prototype.bind.apply(Cls, [].concat(Cls, args));
	return new f();
}

module.exports = {
	hydrateDependency: function(serializedDep, module) {
		try {
			serializedDep.options.forEach((opt, index) => {
				if(opt === "SELF_MODULE_REFERENCE") {
					serializedDep.options[index] = module;
				} else if(opt && opt.serializedRegExp) {
					const fragments = opt.serializedRegExp.match(/\/(.*?)\/([gimy])?$/);
					const rehydratedRegExp = new RegExp(fragments[1], fragments[2] || "");
					serializedDep.options[index] = rehydratedRegExp;
				}
			});
			let ClassDef = require(serializedDep.path);
			const dependency = newCall(ClassDef, serializedDep.options);
			if(dependency.hydrate) {
				dependency.hydrate(serializedDep, module);
			}
			return dependency;
		} catch(e) {
			/**
			 * TODO - handle this better
			 */
			console.log(`Failure to hydrate ${serializedDep.path} with ${serializedDep.options}`);
			console.log(e);
			console.log(require(serializedDep.path) instanceof Function);
		}
	},

	/**
	 * Serialize all of this Modules's dependencies.
	 * This allows a module reference to be passed from parent process to child processes.
	 * @param {Dependency[]} arr - The array of dependencies to serialize.
	 * @returns {array} - An array of serialized dependencies.
	 */
	serializeArray: function(arr) {
		return arr.map(item => {
			try {
				return item.serialize();
			} catch(e) {
				console.log("failed to serialize", item);
				console.log(e);
			}
		});
	}
};
