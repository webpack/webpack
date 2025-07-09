import { msg } from "virtual:my-module";
import myAsyncMessage from "virtual:my-async-module";
import { buildTime } from "virtual:build-info";
import json from "virtual:my-json-modules";
import value from "virtual:my-typescript-module";

console.log(msg); // Output `from virtual module`
console.log(myAsyncMessage); // Output `async-value`
console.log(buildTime); // Output value of `Date.now()`
console.log(json.name); // Output `virtual-url-plugin`
console.log(value); // Output `value-from-typescript`

import { routes } from "virtual:routes";

async function loadRoute(route) {
	return (await routes[route]()).default;
}

console.log(await loadRoute("a")); // Output `a`
console.log(await loadRoute("b")); // Output `b`

import { first, second } from "virtual:code-from-file";

console.log(first); // Output `first`
console.log(second); // Output `second`

import message from "my-custom-scheme:my-module";

console.log(message); // Output `from virtual module with custom scheme`
