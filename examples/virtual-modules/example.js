import { msg } from "virtual:my-module";
import myAsyncMessage from "virtual:my-async-module";
import { version } from "virtual:build-info";
import json from "virtual:my-json-modules";
import value from "virtual:my-typescript-module";
import { hello } from "virtual:hello.ts";

console.log(msg); // Output `from virtual module`
console.log(myAsyncMessage); // Output `async-value`
console.log(version); // Output value of `1.0.0`
console.log(json.name); // Output `virtual-url-plugin`
console.log(value); // Output `value-from-typescript`
console.log(hello); // Output `hello`

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

// Import virtual module with custom context set in source function
import { button } from "virtual:src/components/button.js";

console.log(button); // Output `button`

// Import virtual asset (filename will have virtual: scheme removed)
import logoUrl from "virtual:logo.svg";

console.log(logoUrl); // Output path to logo.svg (without virtual: scheme)
