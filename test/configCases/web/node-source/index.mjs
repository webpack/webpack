// Block `require`, but keep webpack from trying to work around it.
eval("require = undefined")

it("should compile fine", () => {
    // It's okay if this executes fine or if `global` is not defined. If it
    // results in a `require()` call, this will throw a `TypeError` instead.
    try {
        global
    } catch (e) {
        if (!(e instanceof ReferenceError)) throw e
    }
})
