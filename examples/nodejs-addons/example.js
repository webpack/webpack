import { dlopen } from 'node:process';
import { fileURLToPath } from 'node:url';

const file = new URL("./file.node", import.meta.url);
const myModule = { exports: {} };

try {
	dlopen(myModule, fileURLToPath(file));
} catch (err) {
	console.log(err)
	// Handling errors
}

console.log(myModule.exports.hello());
// Outputs: world
