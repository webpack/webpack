function foo() {
  return (
    <nav>
      <Home />
      {
        do {
          if (loggedIn) {
            <LogoutButton />
          } else {
            <LoginButton />
          }
        }
      }
    </nav>
  );
}