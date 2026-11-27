const args = ["./foo.js", { with: { type: "json" } }];

const mod = import.sync(...args);
