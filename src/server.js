const env = require("./config/env");
const app = require("./app");

env.validate();

app.listen(env.port, () => {
  console.log(`StreamFacile démarré sur http://localhost:${env.port} (env: ${env.nodeEnv})`);
});
