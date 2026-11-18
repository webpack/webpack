let a: typeof import("./module", { with: { "resolution-mode": "import" } });
let b: import("./module").Thing<string>;
let c: A.default.B;
