const id = (x) => x;
id(async () => {
	console.log("arrow");
})();
id(async function () {
	console.log("function");
})();
id(async () => 7)().then((v) => console.log("value", v));
function read() {
	return id(async () => typeof this)();
}
read.call(1).then((v) => console.log("this", v));
