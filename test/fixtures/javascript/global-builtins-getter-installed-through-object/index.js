globalThis['Object'].defineProperty(Math, 'abs', { get: function () { console.log('get'); return function () { return 99; }; } }); console.log(Math.abs(-1));
