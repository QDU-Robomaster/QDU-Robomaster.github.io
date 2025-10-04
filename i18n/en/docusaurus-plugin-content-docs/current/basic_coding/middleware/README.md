---
id: middleware-coding
title: Middleware
sidebar_position: 3
---

# Middleware

This module summarizes the middleware components in LibXR used for system services, communication management, terminal interaction, and more. It emphasizes thread safety, resource constraint adaptation, and platform independence, and includes the following features:

## Module Features

- **Unified Abstraction**: Provides core middleware functions such as event handling, logging, topic publishing, and virtual terminals.
- **Multiple Operation Models**: Supports synchronous, asynchronous, queued, and callback-based modes for different scenarios.
- **High Performance**: Heavily utilizes lock-free lists/queues internally to ensure concurrent performance.
- **Embedded Adaptation**: Supports flash minimum write unit constraints, key-value storage on memory-constrained devices, etc.

## Quick Navigation

- [Application Framework](./app-framework.md)
- [Logger System](./logger.md)
- [Event System](./event.md)
- [Topic Publish-Subscribe Mechanism](./message.md)
- [Database Key-Value Storage](./database.md)
- [RamFS In-Memory File System](./ramfs.md)
- [Terminal Command Interface](./terminal.md)

For detailed API explanations and design principles, please refer to the individual pages.
