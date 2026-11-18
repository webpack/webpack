globalThis.holder = {}; function key() { console.log('key'); return 'holder'; } globalThis[key()].abs = function () { return 99; }; console.log(Math.abs(-1));
