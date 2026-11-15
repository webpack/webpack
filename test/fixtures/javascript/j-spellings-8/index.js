import { k } from "k";
let first = 1,
	second = 2;
export { first as one };
console.log(first, second);
export { second as default, k };
