// A script beside the entry, reading globals spelled like its declarations.
globalThis.__test_side_effect__ = true;
module.exports = [typeof fetch, typeof store];
