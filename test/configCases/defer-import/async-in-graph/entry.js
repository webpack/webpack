import * as fullSync from /* webpackDefer: true */ "./full-sync.js";
import * as asyncMod from /* webpackDefer: true */ "./async-mod.js";
import * as deepAsync from /* webpackDefer: true */ "./deep-async.js";

__configCases__deferImport__proposal.push("START entry.js");

export default { fullSync, asyncMod, deepAsync };

__configCases__deferImport__proposal.push("END entry.js");
