let x: typeof import('./x', { with: { type: "json" } });
let Y: import('./y', { with: { type: "json" } }).Y;
let z: import("/z", { with: { type: "json" } }).foo.bar<string>;
