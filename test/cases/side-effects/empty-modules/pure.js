// comment
export default /*#__PURE__*/ console.log.bind(null, "test");
const unused = /*#__PURE__*/ console.log.bind(null, "test");
const unusedExport = /*#__PURE__*/ console.log.bind(null, "test");
export { unusedExport, class1, class2, fun1, fun2, fun3 };
function fun1() {
	console.log.bind(null, "test");
	return unused;
}
const fun2 = function () {
	console.log.bind(null, "test");
};
const fun3 = () => {
	console.log.bind(null, "test");
};
class class1 {
	constructor() {
		console.log.bind(null, "test");
	}
}
const class2 = class {
	constructor() {
		console.log.bind(null, "test");
	}
};
if ("") {
	console.log.bind(null, "test");
}
for (; false; ) {}
for (var i = 0; false; ) {}
while (false) {}
