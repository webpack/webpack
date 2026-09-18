it("should discover new intersections after a higher priority consumes copies", async () => {
  const [a, b, c, d, e] = await Promise.all([
    import(/* webpackChunkName: "A" */ "./A"),
    import(/* webpackChunkName: "B" */ "./B"),
    import(/* webpackChunkName: "C" */ "./C"),
    import(/* webpackChunkName: "D" */ "./D"),
    import(/* webpackChunkName: "E" */ "./E")
  ]);
  expect(a.default).toBe("first module payload for residual sharing");
  expect(b.default).toBe("second module payload for residual sharing");
  for (const value of [c, d, e]) {
    expect(value.first).toBe(a.default);
    expect(value.second).toBe(b.default);
  }
});
