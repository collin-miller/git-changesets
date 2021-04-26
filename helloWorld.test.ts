import HelloWorld from "./helloWorld";

const logger = {
  info: jest.fn()
};

describe("HelloWorld.ts", () => {
  test("Is a useless and basic test 1", () => {
    expect.assertions(1);
    const msg = "Test Message";
    const helloWorld = new HelloWorld(msg, logger);
    helloWorld.writeToLog();
    expect(logger.info).toHaveBeenCalledWith(msg);
  });

  test("Is a useless and basic test 2", () => {
    expect.assertions(1);
    const helloWorld = new HelloWorld(undefined, logger);
    expect(helloWorld.logger).toMatchObject(logger);
  });

  test("Is a useless and basic test 3", () => {
    expect.assertions(1);
    const helloWorld = new HelloWorld();
    expect(helloWorld.message).toEqual("Hello World!");
  });
});
