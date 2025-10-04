---
id: message
title: Message System
sidebar_position: 4
---

# Message System

The `Message` module in LibXR is a high-performance, thread-safe messaging and processing mechanism based on the **publish-subscribe model**. It supports multiple subscription modes including synchronous, asynchronous, queued, and callback-based, with integrated data caching, validation, and packaging — making it a vital tool for module decoupling and real-time communication.

---

## Features

- Support for multiple subscribers receiving the same topic data;
- Supports:
  - **Synchronous subscription** (blocking wait);
  - **Asynchronous subscription** (active polling);
  - **Queued subscription** (history caching);
  - **Callback subscription** (real-time response);
- Internally uses **Red-Black Tree + Lock-Free List** for managing topics and subscribers;
- Provides a standardized **message packing and parsing mechanism**, suitable for UART, CAN, network, etc.;
- Supports data integrity checks, sticky packet handling, and fragmentation recovery.

---

## Quick Start

### Create a Topic and Publish a Message

```cpp
auto domain = LibXR::Topic::Domain("sensor_data");
auto topic = LibXR::Topic::CreateTopic<float>("temperature", &domain, true);

float temp = 23.5f;
topic.Publish(temp);
```

### Synchronous Subscription (Blocking)

```cpp
float received_temp;
auto sync = LibXR::Topic::SyncSubscriber<float>("temperature", received_temp, &domain);

if (sync.Wait(1000) == ErrorCode::OK)
    printf("Sync received temperature: %.2f\n", received_temp);
```

### Asynchronous Subscription (Non-blocking)

```cpp
auto async = LibXR::Topic::ASyncSubscriber<float>("temperature", &domain);

if (async.Available()) {
    float latest_temp = async.GetData();
    printf("Async received temperature: %.2f\n", latest_temp);
}
async.StartWaiting();
```

### Queued Subscription (History Buffer)

```cpp
LibXR::LockFreeQueue<float> queue(10);
auto que_sub = LibXR::Topic::QueuedSubscriber<float>("temperature", queue, &domain);

float temp;
if (queue.Pop(temp) == ErrorCode::OK)
    printf("Queued received temperature: %.2f\n", temp);
```

### Callback Subscription (Real-time Handling)

```cpp
float latest_temp = 0.0f;
auto cb = LibXR::Topic::Callback::Create(
    [](bool, void* arg, LibXR::RawData& data) {
        *reinterpret_cast<float*>(arg) = *reinterpret_cast<float*>(data.addr_);
    }, &latest_temp);

topic.RegisterCallback(cb);
```

## Thread Safety

The `topic` class has a constructor parameter `bool multi_publisher_ = false;`, which is `false` by default. This means only one thread or interrupt is allowed to publish data at any given time.  
When set to `true`, a `mutex_` is used for thread synchronization, allowing multiple threads to publish data concurrently. However, in this mode, publishing from interrupts is **not supported**.

```cpp
Topic(const char *name, uint32_t max_length, Domain *domain = nullptr,
        bool multi_publisher = false, bool cache = false, bool check_length = false);

template <typename Data>
Topic CreateTopic(const char *name, Domain *domain = nullptr,
                           bool multi_publisher = false, bool cache = false,
                           bool check_length = true);
```

---

## Interface Overview

| Class / Method          | Description                             |
|-------------------------|-----------------------------------------|
| `CreateTopic<T>()`      | Create topic (with cache and checksum)  |
| `Publish()`             | Publish data                            |
| `SyncSubscriber`        | Wait synchronously for data             |
| `ASyncSubscriber`       | Read latest data asynchronously         |
| `QueuedSubscriber`      | Push to queue and retain history        |
| `RegisterCallback()`    | Register a callback function            |
| `DumpData()`            | Export cached or packed data            |
| `PackData()`            | Manually construct a packed message     |
| `Server::ParseData()`   | Parse and forward received data         |
| `Server::Register()`    | Register a topic for parsing            |

---

## Message Packing & Parsing

LibXR provides a unified format `PackedData<T>` and a server-side parser `Server`.

### Pack Example

```cpp
topic.Publish(36.5f);
LibXR::Topic::PackedData<float> pkt;
topic.DumpData(pkt);
```

### Packet Format

| Field    | Description               |
|----------|---------------------------|
| `0xA5`   | Fixed header              |
| CRC32    | Topic name checksum       |
| Length   | Data length (24 bits)     |
| CRC8     | Header checksum           |
| Data     | Actual data               |
| CRC8     | Tail checksum             |

---

### Server-side Parsing Example

```cpp
LibXR::Topic::Server server(512);
server.Register(topic);
server.ParseData(ConstRawData(pkt));
```

It automatically handles sticky/fragmented packets, validates data, and publishes valid data to the corresponding topic.

---

## Data Export & PackData

### Read Cached Data

```cpp
double val = 0;
topic.DumpData(val);  // Get the latest value
```

### Pack as Network Format

```cpp
LibXR::Topic::PackedData<double> pkt;
topic.DumpData(pkt);  // With header + checksum
```

### Manually Pack Arbitrary Data

```cpp
double value = 123.45;
RawData src(value);
uint8_t buffer[128];
RawData dst(buffer, sizeof(buffer));

Topic::PackData(topic.GetKey(), dst, src);
```

---

### Method Comparison Summary

| Scenario          | Recommended Method      | Uses Cache | Packed |
|------------------|-------------------------|------------|--------|
| Get latest value | `DumpData(DataType)`    | ✅ Yes     | ❌ No  |
| Network packet   | `DumpData(PackedData&)` | ✅ Yes     | ✅ Yes |
| Custom buffer    | `DumpData<Mode>(...)`   | ✅ Yes     | Optional |
| Manual packing   | `PackData()`            | ❌ No      | ✅ Yes |

---

## Application Scenarios

- Structured message packaging and parsing over UART/network;
- Efficient communication channel between MCU and main controller;
- Data forwarding / logging / state synchronization;
- Fragment recovery and asynchronous parsing support.

---

## Notes

- Topics with the same `Domain` name will reuse objects;
- Topics with the same name in the same domain share instances and must be configured identically;
- `Topic` is a lightweight wrapper and supports copying and passing;
- If no data has been published, `DumpData()` will return `ErrorCode::EMPTY`;
- `PackData()` can be used independently from cache — suitable for logging or simulated data generation.

---
