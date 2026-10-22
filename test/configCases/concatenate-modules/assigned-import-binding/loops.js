import * as counter from "./counter";
import { count } from "./counter";

export function loopOfIdentifier() {
	for (count of [7]) {
		// the write happens before the body runs
	}
}

export function loopInIdentifier() {
	for (count in { seven: 7 }) {
		// same, for the other iteration form
	}
}

export function loopOfNamespaceMember() {
	for (counter.count of [8]) {
		// a namespace member is read-only like the binding itself
	}
}

export async function loopAwaitIdentifier() {
	for await (count of [Promise.resolve(9)]) {
		// `for await` walks the same path as `for of`
	}
}
