import "./async-mod-dep.js";

__configCases__deferImport__proposal.push("START async-mod.js");

await 0;
export let x = 2;

__configCases__deferImport__proposal.push("END async-mod.js");
