// comment
export default /*#__PURE__*/ console.log("test");
const unused = /*#__PURE__*/ console.log("test");
const unusedExport = /*#__PURE__*/ console.log("test");
export { unusedExport, class1, class2, fun1, fun2, fun3 };
function fun1() {
	console.log("test");
	return unused;
}
const fun2 = function () {
	console.log("test");
};
const fun3 = () => {
	console.log("test");
};
class class1 {
	constructor() {
		console.log("test");
	}
}
const class2 = class {
	constructor() {
		console.log("test");
	}
};
if ("") {
	console.log("test");
}
for (; false; ) {}
for (var i = 0; false; ) {}
while (false) {}
