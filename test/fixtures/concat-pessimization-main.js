import { wow } from "./concat-pessimization";

globalThis.__ = () => {
	import("./concat-pessimization-shim");
};

console.log(wow());
