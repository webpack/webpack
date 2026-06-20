import('./bar1.mjs');
import('./bar2\'.mjs');
import("./bar3.mjs");
import("./bar4\".mjs");
import(`./bar5.mjs`);
import(`./bar6
.mjs`);
import(`./bar7



.mjs`);
import(`./bar8'.mjs`);
import(`./bar9\'.mjs`);
import(`./bar10\\'.mjs`);
import(`./bar11".mjs`);
import(`./bar12\".mjs`);
import(`./bar13\\".mjs`);
import(test);

import { name } from './bar14.js';
import json from './json.json' with { type: 'json' }

export var p = 5;
export function q () {

}

export { x } from './bar15.js';

// Comments provided to demonstrate edge cases
import /*comment!*/ (  './bar16.js', { with: { type: 'json' }});
import /*comment!*/.meta.asdf;

// Defer phase imports:
import defer mod from './bar17.js';
import.defer('./bar18.js');

// Source phase imports:
import source mod from './bar19.wasm';
import.source('./bar20.wasm');

import("./" + "bar21.js")
