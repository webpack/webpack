const { dependency3 } = require("./dependency/dependency3");
import { dependency, dependency2 } from "./dependency";

export function component() {
	dependency();
	dependency2();
	dependency3();
}