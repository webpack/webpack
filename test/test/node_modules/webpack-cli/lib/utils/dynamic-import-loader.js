"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function dynamicImportLoader() {
    let importESM;
    try {
        importESM = new Function("id", "return import(id);");
    }
    catch (_err) {
        importESM = null;
    }
    return importESM;
}
module.exports = dynamicImportLoader;
