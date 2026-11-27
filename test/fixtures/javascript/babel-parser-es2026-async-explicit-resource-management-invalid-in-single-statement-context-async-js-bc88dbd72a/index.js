async function f() {
  while (1) await using a = foo;
  for (;;) await using b = foo;
  do await using c = foo; while (1);
  if (1) await using d = foo;
  with (1) await using e = foo;
  label: await using f = foo;
}
