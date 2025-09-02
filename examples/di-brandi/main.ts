#!/usr/bin/env gjs -m

// Simple CLI demonstration of Dependency Injection with Brandi
// This example shows how services are automatically resolved and injected
// All DI configuration and CLI application in one file

import { Container, injected, token } from "brandi";

// Define service interfaces
interface Logger {
	log(msg: string): void;
}

interface Greeter {
	greet(name: string): string;
}

// Create tokens for dependency injection
const TOKENS = {
	LOGGER: token<Logger>("LOGGER"),
	GREETER: token<Greeter>("GREETER"),
} as const;

// Logger service implementation
class LoggerService implements Logger {
	log(msg: string): void {
		console.log(`[Brandi] ${msg}`);
	}
}

// Greeter service implementation with injected dependency
class GreeterService implements Greeter {
	constructor(private logger: Logger) {}

	greet(name: string): string {
		const msg = `Servus, ${name}!`;
		this.logger.log(`greet() -> ${msg}`);
		return msg;
	}
}

// Register injection metadata for constructor parameters
injected(GreeterService, TOKENS.LOGGER);

// Create and configure the container
const container = new Container();
container.bind(TOKENS.LOGGER).toInstance(LoggerService).inSingletonScope();
container.bind(TOKENS.GREETER).toInstance(GreeterService).inSingletonScope();

/**
 * Main CLI application demonstrating Dependency Injection with Brandi
 */
class DiCliApp {
	private greeter: Greeter; // Will be resolved from container

	constructor() {
		// Get GreeterService from DI container - dependencies are automatically resolved!
		this.greeter = container.get(TOKENS.GREETER);
		console.log("🚀 Brandi DI CLI Example Started");
		console.log("==================================");
	}

	/**
	 * Run the CLI application with command line arguments
	 */
	run(args: string[]): void {
		// Parse command line arguments (skip script name and gjs path)
		const name = args[0] || "World"; // First user argument

		console.log(`📝 Greeting requested for: ${name}`);
		console.log("");

		// Use the injected service
		const greeting = this.greeter.greet(name);

		console.log("✅ Result:", greeting);
		console.log("");

		// Demonstrate multiple greetings
		console.log("🎯 Additional greetings:");
		const names = ["Anna", "Ben", "Clara"];

		for (const person of names) {
			const message = this.greeter.greet(person);
			console.log(`   ${message}`);
		}

		console.log("");
		console.log("✨ Dependency Injection working perfectly!");
		console.log("   LoggerService was automatically injected into GreeterService");
		console.log("   Brandi used tokens and explicit binding configuration");
		console.log("   Services bound as singletons with explicit scope management");
	}
}

// Create and run the application
const app = new DiCliApp();

// Handle command line arguments (skip first two: gjs script.js)
app.run(ARGV);
