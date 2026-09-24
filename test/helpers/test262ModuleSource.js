"use strict";

// %AbstractModuleSource% is the abstract base of `WebAssembly.Module`; the suite
// only asks whether a source phase binding is an instance of it.
class AbstractModuleSource {}

module.exports = {
	AbstractModuleSource,
	moduleSource: new AbstractModuleSource()
};
