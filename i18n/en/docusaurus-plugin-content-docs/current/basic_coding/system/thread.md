---
id: thread
title: Thread
sidebar_position: 3
---

# Thread

`LibXR::Thread` encapsulates **thread creation, scheduling, and time control** with a unified object-oriented interface across platforms. Implementations are provided for **POSIX, FreeRTOS, ThreadX, and bare-metal** environments. Users can maintain consistent thread logic without worrying about OS-specific APIs.

## Design Highlights

| Goal                 | Description                                                                 |
|----------------------|-----------------------------------------------------------------------------|
| **Cross-platform**    | Unified API hides `pthread`, `xTask`, `TX_THREAD`, etc.                    |
| **Lightweight**       | Depends only on C++17 and optional RTOS headers; supports no-OS scenarios. |
| **Priority Enum**     | Uses `enum class Priority { IDLE…REALTIME }`, mapped to platform-specific levels. |
| **Unified Timebase**  | All `Sleep` / `SleepUntil` use **milliseconds**; `GetTime()` returns milliseconds since boot. |

## Public Interface Overview

| Method                                                                                                              | Description                                      |
|---------------------------------------------------------------------------------------------------------------------|--------------------------------------------------|
| `template <typename Arg> void Create(Arg arg, void (*func)(Arg), const char* name, size_t stack, Priority prio)`   | Create and start a thread with any function signature. |
| `static Thread Current()`                                                                                           | Get current thread wrapper.                     |
| `static uint32_t GetTime()`                                                                                         | Return milliseconds since system start (wraps at 32-bit). |
| `static void Sleep(uint32_t ms)`                                                                                    | Block current thread for given milliseconds.     |
| `static void SleepUntil(TimestampMS& last, uint32_t period)`                                                        | Periodic delay with auto-updating `last`.        |
| `static void Yield()`                                                                                               | Yield CPU voluntarily.                          |
| `operator libxr_thread_handle()`                                                                                    | Implicitly convert to underlying thread handle.  |

> **Note**: If the system does not support thread priority or real-time scheduling, the adaptation layer can safely downgrade without affecting upper-layer logic.

## Typical Usage

The parameter type of the thread function must be consistent with the arg parameter type of the Create function; otherwise, it will not be recognized.

```cpp
#include <thread.hpp>

void Blink(int* arg) {
    auto last = LibXR::Thread::GetTime();
    while (true) {
        ToggleLED();                          // User-defined function
        LibXR::Thread::SleepUntil(last, 500); // 500 ms interval
    }
}

int main() {
    int arg = 0;
    LibXR::Thread t;
    t.Create(&arg, Blink, "blink", 2048, LibXR::Thread::Priority::MEDIUM);
    // Main thread continues with other tasks …
    for (;;) {
        LibXR::Thread::Yield();
    }
}
```

## Platform Adaptation Overview

| Platform                | Header/Source Files           | Key Mapping                                               |
|-------------------------|-------------------------------|-----------------------------------------------------------|
| **Linux / POSIX**        | `thread.hpp` + `thread.cpp`  | `pthread_create`, `clock_nanosleep`, `sched_yield`       |
| **FreeRTOS**             | `thread.hpp` + `thread.cpp`  | `xTaskCreate`, `vTaskDelay`, `xTaskGetTickCount`         |
| **ThreadX (Azure RTOS)** | `thread.hpp` + `thread.cpp`  | `tx_thread_create`, `tx_thread_sleep`, `tx_thread_relinquish` |
| **Bare-metal**           | `thread.hpp` + `thread.cpp`  | Polling `Timebase` + `Timer::RefreshTimerInIdle` for software delay |

To port to a new platform:

1. Implement `thread.hpp / thread.cpp` under `platform/<os>/`;
2. Typedef `libxr_thread_handle` in `libxr_system.hpp`;
3. Update the build system to include the correct source files.

## Reference Implementation Notes

* POSIX version attempts `SCHED_FIFO` and maps `Priority` within available range; falls back to default with a warning if not supported.
* FreeRTOS/ThreadX versions calculate priority steps from `configMAX_PRIORITIES` or `TX_MAX_PRIORITIES`.
* Bare-metal version starts thread functions directly upon creation, no return to main thread.
