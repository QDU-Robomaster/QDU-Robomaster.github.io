---
id: core-assert
title: 断言与错误处理
sidebar_position: 2
---

# 断言与错误处理

本模块用于运行时错误检查、致命错误处理及调试期间的尺寸校验。其核心是 `LibXR::Assert` 类及 `ASSERT` / `ASSERT_ISR` 宏，常配合 `libxr_def` 使用。

## 致命错误处理接口

```cpp
void libxr_fatal_error(const char *file, uint32_t line, bool in_isr);
```

该函数用于终止程序执行，可在正常或中断上下文中调用。发生断言失败时将自动调用，并可通过 `Assert` 类注册回调处理。

## `LibXR::Assert` 类

用于注册致命错误回调，并在调试模式下进行尺寸检查。

### 注册回调

```cpp
LibXR::Assert::RegisterFatalErrorCB(cb);
```

支持传入任意 `Callback<const char*, uint32_t>` 类型的函数或对象，用于处理致命错误事件。

### 尺寸限制检查

在调试模式（定义 `LIBXR_DEBUG_BUILD`）下启用：

```cpp
template <SizeLimitMode mode>
static void SizeLimitCheck(size_t limit, size_t size);
```

支持三种模式：

- `EQUAL`: 大小必须等于限制值
- `MORE`: 大小必须大于等于限制值
- `LESS`: 大小必须小于等于限制值

发布模式下此函数为空操作。

## 宏定义：断言检查

- `ASSERT(expr)`: 普通上下文断言，失败时调用 `libxr_fatal_error(...)`
- `ASSERT_ISR(expr)`: 中断上下文断言

这些宏由 `LIBXR_DEBUG_BUILD` 控制是否启用，建议用于调试、开发阶段的防御性编程。

## 用例示例

```cpp
auto err_cb = LibXR::Assert::Callback::Create(
    [](bool in_isr, Arg arg, const char *file, uint32_t line)
    {
    // do something
    },
    arg);

LibXR::Assert::RegisterFatalErrorCB(err_cb);

ASSERT(buffer != nullptr);
ASSERT_ISR(interrupt_flag == true);
```

---

本模块为 LibXR 所有调试和安全机制的核心基础，建议在系统开发初期即集成并启用断言与校验逻辑。
