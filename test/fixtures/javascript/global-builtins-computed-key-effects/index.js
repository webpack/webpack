globalThis.Math[(console.log('key'), 'abs')] = function () { return 99; }; console.log(Math.abs(-1));
