---
id: semaphore
title: Semaphore
sidebar_position: 5
---

# Semaphore

`LibXR::Semaphore` provides **counting semaphores** to coordinate access to shared resources between multiple tasks or ISRs. It supports blocking waits (`Wait`) in thread context and safe releases (`PostFromCallback`) in interrupt context. Current implementations cover **POSIX `sem_t`**, **FreeRTOS Counting Semaphore**, **ThreadX `TX_SEMAPHORE`**, and **bare-metal spinlock** variants.

## Design Highlights

| Goal             | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| **Cross-platform** | Abstracts over `sem_t`, `SemaphoreHandle_t`, `TX_SEMAPHORE`, etc.          |
| **ISR-friendly** | Provides `PostFromCallback(bool in_isr)` to safely release from ISR/DMA callbacks with task switching. |
| **Timeout support** | `Wait(timeout_ms)` supports millisecond-level timeout.                    |
| **Lightweight**  | Depends only on C++17 and optionally on RTOS headers.                       |
| **Observability** | `Value()` returns the current count, useful for debugging and performance monitoring. |

## Core Interface

```cpp
class Semaphore {
public:
  explicit Semaphore(uint32_t init = 0);
  ~Semaphore();

  void     Post();                    // Release from thread context
  void     PostFromCallback(bool irq);// Release from ISR/callback context
  ErrorCode Wait(uint32_t timeout=UINT32_MAX); // Blocking wait
  size_t   Value();                   // Current count
};
```

### Error Codes

* `ErrorCode::OK`       Operation successful  
* `ErrorCode::TIMEOUT`  Wait timed out  

> **⚠️ Note**: `Wait()` **must not** be called from an ISR.
