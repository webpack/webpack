async function f() {
  switch(1) {
    case 1: for(await using x = bar();;);
  }
}
