"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ModuleDependency = require("./ModuleDependency");
class DelegatedSourceDependency extends ModuleDependency {
}
DelegatedSourceDependency.prototype.type = "delegated source";
module.exports = DelegatedSourceDependency;
