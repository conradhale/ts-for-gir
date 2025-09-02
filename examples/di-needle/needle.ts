import { Container, InjectionToken } from "@needle-di/core";

// Define service interfaces
export interface Logger {
	log(msg: string): void;
}

export interface Greeter {
	greet(name: string): string;
}

// Logger service implementation
export class LoggerService implements Logger {
	log(msg: string): void {
		console.log(`[Needle] ${msg}`);
	}
}

// Create injection tokens
export const LoggerToken = new InjectionToken<LoggerService>("LoggerService");

// Greeter service with proper dependency injection
export class GreeterService implements Greeter {
	constructor(private logger: LoggerService) {}

	greet(name: string): string {
		const msg = `Hallo, ${name}!`;
		this.logger.log(`greet() -> ${msg}`);
		return msg;
	}
}

// Factory function for GreeterService that resolves dependencies
const createGreeterService = (container: Container) => {
	const logger = container.get(LoggerToken);
	return new GreeterService(logger);
};

// Create and configure the container
export const needle = new Container();

// Bind the LoggerService as a concrete value
needle.bind({
	provide: LoggerToken,
	useValue: new LoggerService(),
});

// Bind GreeterService using factory
needle.bind({
	provide: GreeterService,
	useFactory: createGreeterService,
});
