it("should work", () => import("./module.wat").then(({ bar }) => {
    const bytes = new Uint8Array(bar.buffer, 0, 2);
    const string = new TextDecoder("utf8").decode(bytes);
    expect(string).toBe("Hi");
    expect(bar.buffer instanceof SharedArrayBuffer).toBe(true);
}))