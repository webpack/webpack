// A member read of a parameter every call passes one constant runs nothing
// but where that constant is `null`.
var key = 1;
(function (value) {
	return value[key];
})(3);
(function (value) {
	value.length;
	console.log(typeof value);
})("text");
try {
	(function (value) {
		value.missing;
	})(null);
} catch (error) {
	console.log(error.name);
}
// One `arguments` may set keeps its read.
(function (value) {
	arguments[0] = null;
	try {
		value.x;
	} catch (error) {
		console.log("threw");
	}
})(3);
console.log(key);
