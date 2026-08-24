const app = require("./app");

app.listen(process.env.PORT || 3000, () => {
  console.log(`StreamFacile démarré sur http://localhost:${process.env.PORT || 3000}`);
});
