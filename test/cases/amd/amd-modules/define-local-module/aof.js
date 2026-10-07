const module = { value: "aof" };
const factory = function (dep) {
	return { value: module.value + dep.value };
};
define(["./f"], factory);
