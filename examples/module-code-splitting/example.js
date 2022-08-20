import { resetCounter, print } from "./methods";

setTimeout(async () => {
	const counter = await import("./counter");
	print(counter.value);
	counter.increment();
	counter.increment();
	counter.increment();
	print(counter.value);
	await resetCounter();
	print(counter.value);
}, 100);
