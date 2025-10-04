---
id: message
title: 消息系统
sidebar_position: 4
---

# Message 消息系统

LibXR 中的 `Message` 模块是一个基于 **发布-订阅（Publish-Subscribe）模式** 的高效、线程安全的消息传输与处理机制。支持同步、异步、队列与回调多种订阅方式，集成数据缓存、校验与打包传输能力，是模块解耦与实时通信的重要工具。

---

## 功能特点

- 支持多个订阅者同时接收同一主题数据；
- 支持：
  - **同步订阅**（阻塞等待）；
  - **异步订阅**（主动轮询）；
  - **队列订阅**（缓存历史）；
  - **回调订阅**（实时响应）；
- 内部采用 **红黑树 + 无锁链表** 管理主题与订阅者；
- 提供标准化的 **消息打包与解析机制**，适用于串口、CAN、网络等链路；
- 支持数据完整性校验、拼包粘包处理与碎片恢复。

---

## 快速上手

### 创建 Topic 并发布消息

```cpp
auto domain = LibXR::Topic::Domain("sensor_data");
auto topic = LibXR::Topic::CreateTopic<float>("temperature", &domain);

float temp = 23.5f;
topic.Publish(temp);
```

### 同步订阅（阻塞）

```cpp
float received_temp;
auto sync = LibXR::Topic::SyncSubscriber<float>("temperature", received_temp, &domain);

if (sync.Wait(1000) == ErrorCode::OK)
    printf("同步接收温度: %.2f\n", received_temp);
```

### 异步订阅（非阻塞）

```cpp
auto async = LibXR::Topic::ASyncSubscriber<float>("temperature", &domain);

if (async.Available()) {
    float latest_temp = async.GetData();
    printf("异步接收温度: %.2f\n", latest_temp);
}
async.StartWaiting();
```

### 队列订阅（历史缓存）

```cpp
LibXR::LockFreeQueue<float> queue(10);
auto que_sub = LibXR::Topic::QueuedSubscriber<float>("temperature", queue, &domain);

float temp;
if (queue.Pop(temp) == ErrorCode::OK)
    printf("队列接收温度: %.2f\n", temp);
```

### 回调订阅（实时处理）

```cpp
float latest_temp = 0.0f;
auto cb = LibXR::Topic::Callback::Create(
    [](bool, void* arg, LibXR::RawData& data) {
        *reinterpret_cast<float*>(arg) = *reinterpret_cast<float*>(data.addr_);
    }, &latest_temp);

topic.RegisterCallback(cb);
```

## 线程安全

topic在构造时有`bool multi_publisher_ = false;`参数,默认为false,即只允许同时有一个线程/中断发布数据。当设置为true时,使用`mutex_`进行线程同步，允许多个线程同时发布数据，但无法在中断使用。

```cpp
Topic(const char *name, uint32_t max_length, Domain *domain = nullptr,
        bool multi_publisher = false, bool cache = false, bool check_length = false);

template <typename Data>
Topic CreateTopic(const char *name, Domain *domain = nullptr,
                           bool multi_publisher = false, bool cache = false,
                           bool check_length = true);
```

---

## 类接口概览

| 类 / 方法 | 说明 |
|-----------|------|
| `CreateTopic<T>()` | 创建主题（带缓存与校验） |
| `Publish()` | 发布数据 |
| `SyncSubscriber` | 同步等待数据 |
| `ASyncSubscriber` | 异步读取最新数据 |
| `QueuedSubscriber` | 存入队列，保留历史 |
| `RegisterCallback()` | 注册回调函数 |
| `DumpData()` | 导出缓存数据或打包数据 |
| `PackData()` | 手动构造带头消息 |
| `Server::ParseData()` | 消息解包与转发 |
| `Server::Register()` | 注册解析目标 Topic |

---

## 消息打包与解析机制

LibXR 提供统一的打包格式 `PackedData<T>` 和服务端解析器 `Server`。

### 打包数据示例

```cpp
topic.Publish(36.5f);
LibXR::Topic::PackedData<float> pkt;
topic.DumpData(pkt);
```

### 数据包格式

| 字段 | 含义 |
|------|------|
| `0xA5` | 固定头部 |
| CRC32 | Topic 名称校验 |
| Length | 数据长度（24 位） |
| CRC8 | 头部校验 |
| Data | 实际数据 |
| CRC8 | 尾部校验 |

---

### 服务端解析示例

```cpp
LibXR::Topic::Server server(512);
server.Register(topic);
server.ParseData(ConstRawData(pkt));
```

会自动处理粘包与拆包，校验数据并放弃无效数据。然后将数据发布到对应的Topic。

---

## 数据导出与 PackData

### 读取缓存数据

```cpp
double val = 0;
topic.DumpData(val);  // 获取最新数据
```

### 打包为网络格式

```cpp
LibXR::Topic::PackedData<double> pkt;
topic.DumpData(pkt);  // 带头 + 校验
```

### 手动打包任意数据

```cpp
double value = 123.45;
RawData src(value);
uint8_t buffer[128];
RawData dst(buffer, sizeof(buffer));

Topic::PackData(topic.GetKey(), dst, src);
```

---

### 方法对比总结

| 场景 | 推荐方法 | 是否依赖缓存 | 是否打包 |
|------|----------|---------------|-----------|
| 获取最新值 | `DumpData(DataType)` | ✅ 是 | ❌ 否 |
| 网络打包 | `DumpData(PackedData&)` | ✅ 是 | ✅ 是 |
| 自定义 buffer | `DumpData<Mode>(RawData, pack)` | ✅ 是 | 可选 |
| 独立打包 | `PackData()` | ❌ 否 | ✅ 是 |

---

## 应用场景

- 串口/网络消息结构化封装与解析；
- MCU 与主控通信的高效通道；
- 数据转发 / 日志传输 / 状态同步；
- 支持碎片恢复与异步解析。

---

## 注意事项

- 同一 `Domain` 名称将复用对象；
- 同一域名下的同名 `Topic` 将共享实例，配置需一致；
- `Topic` 为轻量包装类，支持拷贝与传参；
- 若未发布数据，`DumpData()` 会返回 `ErrorCode::EMPTY`；
- `PackData()` 可脱离缓存使用，适合日志或模拟数据生成。

---
