# 🚀 Getting Started

This guide will walk you through setting up Lumiere and creating your first dependency injection container.

## Table of contents

- [🚀 Getting Started](#-getting-started)
  - [Table of contents](#table-of-contents)
  - [Installation](#installation)
  - [TypeScript configuration (for decorators if using)](#typescript-configuration-for-decorators-if-using)
    - [Alternative: Without decorators](#alternative-without-decorators)
  - [Basic setup](#basic-setup)
  - [Your first container](#your-first-container)
  - [Injecting dependencies](#injecting-dependencies)
    - [Optional dependencies](#optional-dependencies)
  - [Using tokens](#using-tokens)
  - [Next steps](#next-steps)

## Installation

Install Lumiere using your preferred package manager:

```bash
npm install @lumiere/core
# or
pnpm add @lumiere/core
# or
yarn add @lumiere/core
# or
bun add @lumiere/core
```

## TypeScript configuration (for decorators if using)

To use decorators like `@NodeInjectable()`, enable experimental decorators in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### Alternative: Without decorators

If you prefer not to use decorators, use `makeInjectable` to mark classes as injectable:

```typescript
import { makeInjectable } from '@lumiere/core';

class _UserService {
  public getUser() {
    return { id: 1, name: "John Doe" };
  }
}

export type UserService = _UserService;
export const UserService = makeInjectable(_UserService);
```

## Basic setup

Lumiere uses three core concepts:

1. **Container** - Manages all your dependencies
2. **Providers** - Register services and values
3. **Injection** - Retrieve dependencies when needed

## Your first container

```typescript
import { NodeContainer, NodeInjectable, nodeInject } from '@lumiere/core';

// 1. Define injectable services
@NodeInjectable()
class Logger {
  public log(message: string) {
    console.log(`[LOG]: ${message}`);
  }
}

@NodeInjectable()
class UserService {
  private readonly logger = nodeInject(Logger);

  public getUser(id: string) {
    this.logger.log(`Fetching user ${id}`);
    return { id, name: 'John Doe' };
  }
}

// 2. Create and configure container
const container = new NodeContainer();

// 3. Register providers
container.provide([Logger, UserService]);

// 4. Bootstrap the container
container.bootstrap();

// 5. Use your services
const userService = container.get(UserService);
const user = userService.getUser('123');
```

## Injecting dependencies

Use `nodeInject()` to inject dependencies into your services:

```typescript
@NodeInjectable()
class EmailService {
  private readonly logger = nodeInject(Logger);
  private readonly config = nodeInject(CONFIG_TOKEN);

  public sendEmail(to: string, message: string) {
    this.logger.log(`Sending email to ${to}`);
    // Use this.config...
  }
}
```

Or you can inject via factory functions:

```typescript
container.provide({
  provide: EMAIL_SERVICE,
  factory: () => {
    const logger = nodeInject(Logger);
    return new EmailService(logger);
  }
});
```

### Optional dependencies

Mark dependencies as optional to handle cases where they may not be provided:

```typescript
@NodeInjectable()
class MyService {
  private readonly optionalLogger = nodeInject(Logger, { optional: true });
  //                       ^? Logger | null – infers nullability!

  public doSomething() {
    this.optionalLogger?.log('Doing something');
  }
}
```

## Using tokens

Tokens let you inject values that aren't classes, like configuration objects:

```typescript
import { NodeToken, NodeContainer } from '@lumiere/core';

// Define a token
interface Config {
  apiUrl: string;
  timeout: number;
}

const CONFIG_TOKEN = new NodeToken<Config>('CONFIG');

// Provide a value
const container = new NodeContainer();

container.provide({
  provide: CONFIG_TOKEN,
  value: {
    apiUrl: 'https://api.example.com',
    timeout: 5000
  }
});

// Or use the helper method
container.provide(
  CONFIG_TOKEN.withValue({
    apiUrl: 'https://api.example.com',
    timeout: 5000
  })
);

container.bootstrap();
const config = container.get(CONFIG_TOKEN);
```

## Next steps

Now that you understand the basics, explore these topics:

- **[Providers Guide](./PROVIDERS.md)** - Learn about different provider types (value, factory, class, alias)
- **[Tokens Guide](./TOKENS.md)** - Deep dive into NodeToken and MultiNodeToken
- **[Async Injection Guide](./ASYNC_INJECTION.md)** - Lazy loading and sub-containers
- **[Testing Guide](./TESTKIT.md)** - Testing with the Lumiere testkit
- **[API Reference](./API.md)** - Complete API documentation
- **[Error Reference](./TROUBLESHOOTING.md)** - Troubleshooting common issues
