---
id: core-op
title: Operation 操作模型
sidebar_position: 9
---

# Operation 操作模型

本模块定义了通用的 `Operation<Args...>` 模板类，用于描述具有完成反馈机制的异步操作。支持回调（Callback）、阻塞（Block）、轮询（Polling）三种模式，适用于嵌入式 I/O 操作中的统一完成处理。

## 操作模式

### OperationType

```cpp
enum class OperationType : uint8_t {
  CALLBACK,  // 使用回调函数处理完成事件
  BLOCK,     // 使用信号量阻塞等待
  POLLING,   // 轮询标志位
  NONE       // 不处理完成
};
```

### POLLING 状态枚举

```cpp
enum class OperationPollingStatus : uint8_t {
  READY,
  RUNNING,
  DONE
};
```

## 构造方式

```cpp
// 默认构造：类型为 NONE
Operation();

// 构造阻塞操作
Operation(Semaphore &sem, uint32_t timeout = UINT32_MAX);

// 构造回调操作
Operation(Callback<Args...> &cb);

// 构造轮询操作
Operation(OperationPollingStatus &status);
```

## 状态更新

```cpp
void UpdateStatus(bool in_isr, Args&&... args);
void MarkAsRunning();
```

- `UpdateStatus(...)` 会根据操作类型触发回调、释放信号量或设置轮询状态。
- `MarkAsRunning()` 在 POLLING 模式下设置状态为 RUNNING。
- 这两个函数通常由驱动主动调用，用户无需关心。

## 示例用法

### 阻塞等待写入完成

```cpp
Semaphore sem;
WriteOperation op_block(sem, 100);
write_port(data, op_block);
```

### 回调方式读取数据

```cpp
auto cb = Callback<ErrorCode>::Create([](bool in_isr, int context, ErrorCode ec) {
  // 回调处理逻辑
}, 123);  // 绑定 context 为 123

ReadOperation op_cb(cb);
read_port(buffer, op_cb);
```

### 轮询方式查询完成状态

```cpp
OperationPollingStatus status = OperationPollingStatus::READY;
ReadOperation op_poll(status);
read_port(buffer, op_poll);

// 后续通过 status 查询是否完成
if (status == OperationPollingStatus::DONE) {
  // 数据已读取完成
}
```

---

`Operation` 是 LibXR I/O 操作的基础机制，适用于串口、网络、定时器等模块，统一管理完成行为，确保线程、中断上下文均安全。
