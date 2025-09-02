# Brandi DI CLI Example

This example demonstrates Dependency Injection using Brandi in a simple GJS CLI application.

## Features

- **Token-based DI**: Uses Brandi's token system for dependency injection
- **Constructor Injection**: Dependencies are injected via constructor parameters
- **Type Safety**: Full TypeScript support with automatic type inference
- **CLI Interface**: Easy to run and test without GUI dependencies
- **Command Line Arguments**: Accepts names as arguments for personalized greetings

## How It Works

### 1. Service Definition with Tokens

```typescript
// Create tokens for dependency injection
export const TOKENS = {
    LOGGER: token<Logger>("LOGGER"),
    GREETER: token<Greeter>("GREETER"),
};

// Logger service implementation
export class LoggerService implements Logger {
    log(msg: string): void {
        log(`[Brandi] ${msg}`);
    }
}

// Greeter service with injected dependency
export class GreeterService implements Greeter {
    constructor(private logger: Logger) {}

    greet(name: string): string {
        const msg = `Servus, ${name}!`;
        this.logger.log(`greet() -> ${msg}`);
        return msg;
    }
}

// Register injection metadata
injected(GreeterService, TOKENS.LOGGER);
```

### 2. Container Configuration

```typescript
// Create and configure the container
const container = new Container();
container.bind(TOKENS.LOGGER).toInstance(LoggerService).inSingletonScope();
container.bind(TOKENS.GREETER).toInstance(GreeterService).inSingletonScope();

// Get service with automatically resolved dependencies
const greeter = container.get(TOKENS.GREETER);
```

## Key Features of Brandi

1. **Token System**: Uses tokens to identify dependencies instead of classes
2. **Injection Metadata**: `injected()` decorator registers constructor parameter mappings
3. **Singleton Scope**: Services can be configured as singletons
4. **Type Safety**: Full TypeScript support with proper type inference

## Running the Example

### Build the example
```bash
yarn run build
```

### Run without arguments (greets "World")
```bash
yarn start
# or
yarn greet
```

### Run with custom name
```bash
yarn greet Anna
# or
gjs -m dist/main.js Anna
```

### Example Output
```
🚀 Brandi DI CLI Example Started
=================================
📝 Greeting requested for: Anna

✅ Result: Servus, Anna!

🎯 Additional greetings:
   Servus, Anna!
   Servus, Ben!
   Servus, Clara!

✨ Dependency Injection working perfectly!
   LoggerService was automatically injected into GreeterService
   Brandi container managed all dependencies
```

## Understanding the DI Flow

1. **Token Registration**: Services are identified by tokens
2. **Injection Registration**: `injected()` tells Brandi which constructor parameters to inject
3. **Container Binding**: Services are bound to tokens with scope configuration
4. **Dependency Resolution**: `container.get()` resolves all dependencies automatically
5. **Type Safety**: TypeScript ensures all dependencies are correctly typed

This example shows how Brandi's token-based approach provides clean and flexible dependency injection!
