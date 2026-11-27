const mod1 = import.sync();
const mod2 = import.sync("./foo.js", { with: { type: "json"} }, { defer: true });
