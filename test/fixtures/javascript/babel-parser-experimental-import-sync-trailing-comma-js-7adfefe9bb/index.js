const mod1 = import.sync("./foo.json", /* 1 */);

const mod2 = import.sync("./foo.json", { with: { type: "json" } }, /* 2 */);
