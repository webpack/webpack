
      "";
      `
        ${
          import(`test/${ import(b)}`); /*
              `  }
          */
        }
      `
      export { a }
    