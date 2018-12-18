// Block `require`, but keep Webpack from trying to work around it.
eval("require = undefined")

it("should compile fine", () => {
    global
})
