async () => {
  switch(1) {
    case 1:
      {}
      await using x = bar();
    default:
      {}
      await using y = bar();
  }
}
