globalThis['String']['prototype'].toLowerCase = function () { return 'patched'; }; console.log('A'.toLowerCase());
