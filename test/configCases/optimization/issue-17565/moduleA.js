var versions = [1, 2]
var Unused = class { constructor() { } },
    Used = class {
        constructor(t) {
            if (!versions.includes(t)) {
                throw "invalid version";
            }
        }

        *[Symbol.iterator]() {
            yield "";
        }
    }

var SP = Used, w8 = { MyClass: SP };
export { w8 as default };
