export let calls = 0;

export default function assert(value) {
	calls += value;
}
