
      ({
        // not a dynamic import!
        import(not1) {}
      });
      {
        // is a dynamic import!
        import(is1);
      }
      a.
      // not a dynamic import!
      import(not2);
      a.
      b()
      // is a dynamic import!
      import(is2);

      const myObject = {
        import: ()=> import(some_url)
      }
    