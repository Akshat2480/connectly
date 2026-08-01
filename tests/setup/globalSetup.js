const { connect, clearDatabase, closeDatabase } = require("./testDb");

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());
