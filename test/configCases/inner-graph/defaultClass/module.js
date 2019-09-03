import { uniq } from "lodash-es";

export default class SomeClass {
	message(...args) {
		console.log(...args);
	}

	unusedUniq(array) {
		uniq(array);
	}
}
