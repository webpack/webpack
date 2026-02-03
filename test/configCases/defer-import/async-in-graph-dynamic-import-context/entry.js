let file;
file = "full-sync.js";
const fullSync = await import(/* webpackDefer: true */ "../async-in-graph/" + file);
file = "async-mod.js";
const asyncMod = await import(/* webpackDefer: true */ "../async-in-graph/" + file);
file = "deep-async.js";
const deepAsync = await import(/* webpackDefer: true */ "../async-in-graph/" + file);
file = "reexport-async.js";
const reexportAsync = await import(/* webpackDefer: true */ "../async-in-graph/" + file);

__configCases__deferImport__proposal.push("START entry.js");

export default { fullSync, asyncMod, deepAsync, reexportAsync };

__configCases__deferImport__proposal.push("END entry.js");
