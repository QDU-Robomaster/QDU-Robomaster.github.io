---
id: mutex
title: Mutex
sidebar_position: 4
---

# Mutex (Mutual Exclusion Lock)

`LibXR::Mutex` provides a lightweight, cross-platform **thread mutual exclusion** mechanism for protecting critical sections in a multitasking environment. It currently supports **POSIX pthread**, **FreeRTOS**, and **ThreadX**. In bare-metal environments, it can degrade into a no-op implementation (e.g., spinlock or disabling interrupts).

> **⚠️ Note**: Mutex **must only** be used in thread context. It is **not supported** in interrupt service routines (ISRs).

## Design Highlights

| Goal               | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| **Cross-platform** | Hides differences like `pthread_mutex`, `xSemaphoreHandle`, `TX_MUTEX`, etc.|
| **RAII-friendly**  | Built-in `LockGuard` to prevent forgetting `Unlock()`.                      |
| **Priority Inheritance** | Enables priority inheritance on supported RTOS to reduce priority inversion risk. |
| **Lightweight**    | Call path is close to low-level system calls for minimal overhead.          |

## Core Interface

```cpp
class Mutex {
public:
  Mutex();
  ~Mutex();

  ErrorCode Lock();     // Blocking lock
  ErrorCode TryLock();  // Non-blocking attempt
  void Unlock();        // Unlock

  class LockGuard {
  public:
    explicit LockGuard(Mutex& m);
    ~LockGuard();
  };
};
```

## Usage Example

```cpp
LibXR::Mutex m;
int shared = 0;

void Worker()
{
  LibXR::Mutex::LockGuard lock(m);  // Locks on construction
  shared++;                         // Safe access
}                                    // Unlocks on destruction
```
