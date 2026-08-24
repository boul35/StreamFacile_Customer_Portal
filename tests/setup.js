process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgres://streamfacile:streamfacile@localhost:5432/streamfacile_test";
