---
id: core-def
title: 公共定义
sidebar_position: 1
---

# 公共定义

本模块提供 LibXR 中最基础的宏、常量、错误码及通用模板函数，广泛用于其他模块的实现。它避免平台差异、简化编码，并为调试与运行时检查提供基础设施。

## 数学与物理常量

- `M_PI`, `M_2PI`: 圆周率及其两倍，常用于角度计算。
- `M_1G`: 标准重力加速度常量，值为 `9.80665 m/s²`。

## 常用宏定义

- `DEF2STR(x)`: 将宏值转为字符串。
- `UNUSED(x)`: 用于消除未使用变量的编译器警告。
- `OFFSET_OF(type, member)`: 获取结构体成员的偏移量。
- `MEMBER_SIZE_OF(type, member)`: 获取结构体成员的字节大小。
- `CONTAINER_OF(ptr, type, member)`: 从成员指针获取结构体指针，常用于回溯对象。

## 缓存行定义

- `LIBXR_CACHE_LINE_SIZE`: 根据平台指针位数定义的缓存行大小，64 位平台为 64 字节，32 位平台为 32 字节。

## 错误码定义（`ErrorCode`）

枚举类型 `ErrorCode` 定义了统一的错误码系统，用于表示各类操作结果：

| 名称         | 值   | 含义               |
|--------------|------|--------------------|
| `OK`         | 0    | 操作成功           |
| `FAILED`     | -1   | 操作失败           |
| `INIT_ERR`   | -2   | 初始化错误         |
| `ARG_ERR`    | -3   | 参数错误           |
| `STATE_ERR`  | -4   | 状态错误           |
| `SIZE_ERR`   | -5   | 尺寸错误           |
| `CHECK_ERR`  | -6   | 校验失败           |
| `NOT_SUPPORT`| -7   | 功能不支持         |
| `NOT_FOUND`  | -8   | 未找到对象         |
| `NO_RESPONSE` | -9   | 无响应             |
| `NO_MEM`     | -10  | 内存不足           |
| `NO_BUFF`    | -11  | 缓冲区不足         |
| `TIMEOUT`    | -12  | 操作超时           |
| `EMPTY`      | -13  | 数据为空           |
| `FULL`       | -14  | 数据已满           |
| `BUSY`       | -15  | 资源忙碌中         |
| `PTR_NULL`   | -16  | 空指针错误         |
| `OUT_OF_RANGE`| -17 | 超出有效范围       |

## 尺寸限制模式（`SizeLimitMode`）

用于运行时检查尺寸是否符合要求：

- `EQUAL`: 必须等于参考值  
- `LESS`: 小于或等于参考值  
- `MORE`: 大于或等于参考值  
- `NONE`: 不限制尺寸

## 断言宏

提供统一的运行时断言机制：

- `ASSERT(x)`: 在调试模式下检查表达式是否为真，否则触发致命错误
- `ASSERT_ISR(x)`: 用于中断上下文的断言检查

在 `LIBXR_DEBUG_BUILD` 编译宏启用时生效，触发时会调用：

```cpp
void libxr_fatal_error(const char *file, uint32_t line, bool in_isr);
```

可通过注册回调处理断言失败行为（详见 `libxr_assert.hpp`）。

## 通用模板函数

```cpp
template <typename T1, typename T2>
constexpr auto LibXR::max(T1 a, T2 b) -> common_type<T1, T2>::type;

template <typename T1, typename T2>
constexpr auto LibXR::min(T1 a, T2 b) -> common_type<T1, T2>::type;
```

用于计算任意类型的最大/最小值，支持整数、浮点等常见数值类型。

---

该文件为 LibXR 的所有模块提供基础能力，强烈建议在开发过程中充分利用本模块的工具和约定。
