const ExportsDefaultTest = require('./exports-default').default;
const ModuleExportsDefault = require('./module-exports-default').default;
const exportsDefaultTest = new ExportsDefaultTest();
const moduleExportsDefault = new ModuleExportsDefault();
module.exports.exportsDefaultTest = exportsDefaultTest.getString();
module.exports.moduleExportsDefault = moduleExportsDefault.getString();