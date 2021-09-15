import { message } from "./module";

console.log(message);

export async function printMessage() {
	const { message } = await import("./chunk");
	console.log(message);
}

printMessage();
