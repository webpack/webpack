export { value } from "./file";
export { value as value2 } from "./file2";
export var counter = 0;
module.hot.accept("./file");
module.hot.accept("./file2", function() {
	counter++;
});
