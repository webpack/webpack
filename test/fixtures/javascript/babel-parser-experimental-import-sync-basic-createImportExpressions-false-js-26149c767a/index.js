// createImportExpressions: false is irrelevant to the fact
// that `import.sync` is always parsed as an ImportExpression because
// `import.sync` is a proposal syntax separate from `import()`
const mod = import.sync("./foo.js");
