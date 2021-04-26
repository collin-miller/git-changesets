import HelloWorldOptions from "./helloWorldInterface";
import logger from "./loggerInterface";

export default class HelloWorld {
  constructor(message?: string, logger?: logger) {
    this.message = message || "Hello World!";
    this.logger = logger || console;
  }
  public message: string;
  public logger: logger;
  public writeToLog(): void {
    this.logger.info(this.message);
  }
}
