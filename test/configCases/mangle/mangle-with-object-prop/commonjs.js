exports.abc = "abc";
exports.def = "def";
exports.setToString = () => {
	exports.toString = () => "toString";
};
exports.moduleId = module.id;
exports.a = "single char";
exports["="] = "single char non-identifier";
exports.$1 = "double char";
exports.__1 = "3 chars";
