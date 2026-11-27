declare namespace invalid_namespace_var {
  await using A;
  await using A1 = 0;
  await using A2: number = 0;
  await using B, C;
}
