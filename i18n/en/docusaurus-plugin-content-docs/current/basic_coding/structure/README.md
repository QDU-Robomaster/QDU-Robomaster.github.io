---
id: structure-coding
title: Data Structures
sidebar_position: 2
---

# Data Structures

This module summarizes the general-purpose data structures used in LibXR for task scheduling, data communication, and resource management. The design takes into account the constraints of embedded systems, including memory limits, concurrent access, and platform differences. The module includes the following structures:

## Module Features

- **Platform Independent**: All interfaces are abstracted to be platform-agnostic and portable.
- **Memory Controllable**: Most structures support external buffers or fixed capacity to avoid runtime allocation.
- **Thread/Interrupt Safe**: Some structures are designed with mutexes or lock-free algorithms, suitable for multithreading or interrupt contexts.
- **Clear Structure**: Each structure encapsulates a base node, template node, and core operation interfaces for easy extensibility.

## Quick Navigation

- [Queue](./queue.md)
- [LockFreeQueue](./lockfree_queue.md)
- [Stack](./stack.md)
- [List](./list.md)
- [LockFreeList](./lockfree_list.md)
- [RBTree](./rbt.md)
- [DoubleBuffer](./double_buffer.md)

For detailed usage, performance comparisons, and application scenarios, please refer to the individual pages and design notes.
