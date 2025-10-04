---
id: core-callback
title: 通用回调
sidebar_position: 3
---

# 通用回调

本模块提供轻量级、可嵌入中断的通用回调系统，包括 `Callback` 和 `CallbackBlock` 两个模板类，广泛用于异步通知、事件处理、错误回调等场景。

## CallbackBlock

```cpp
template <typename ArgType, typename... Args>
class CallbackBlock;
```

用于封装一个具体的回调函数及其第一个绑定参数，支持中断上下文安全调用：

- `FunctionType`: 回调函数签名为 `void(bool in_isr, ArgType arg, Args... args)`。
- `Call(bool in_isr, Args&&...)`: 执行回调，传递额外参数。

构造时即完成函数与绑定参数的绑定。支持移动构造与移动赋值，禁用拷贝。

## Callback

```cpp
template <typename... Args>
class Callback;
```

对 `CallbackBlock` 的进一步封装，提供统一接口、类型擦除和创建工厂方法：

### 创建回调

```cpp
LibXR::Callback<Args...> cb = LibXR::Callback<Args...>::Create(fun, bound_arg);
```

- `fun`: 回调函数，格式为 `void(bool, BoundArgType, Args...)`
- `bound_arg`: 回调函数的第一个绑定参数

### 执行回调

```cpp
cb.Run(in_isr, arg1, arg2, ...);
```

可传递任意数量的附加参数，`in_isr` 指示是否在中断上下文中调用。

### 其他接口

- `Empty()`: 判断回调是否为空
- 支持默认构造、拷贝构造、移动构造与赋值

## 使用示例

```cpp
void OnEvent(bool in_isr, int context, const char* msg) {
  printf("ISR=%d context=%d msg=%s\n", in_isr, context, msg);
}

auto cb = LibXR::Callback<const char*>::Create(OnEvent, 42);
cb.Run(false, "Hello");
```

输出：

```bash
ISR=0 context=42 msg=Hello
```

## 设计特点

- **无动态内存管理需求**：除非用户自定义 CallbackBlock 派生类
- **支持 ISR 上下文**：可在中断中安全调用
- **类型安全封装**：利用模板与类型推导实现参数绑定
- **适用于嵌入式场景**：非常轻量，占用资源小

---

该模块是 LibXR 异步机制与回调接口的基础组件，适用于 IO、定时器、事件发布等模块的回调传递。
