---
id: core-string
title: 定长字符串
sidebar_position: 5
---

# 定长字符串

`LibXR::String<N>` 是一个模板类，用于封装定长字符串，支持安全的构造、比较、查找、追加等操作，适用于资源受限的嵌入式环境。

## 特性概览

- **固定长度**：最大长度通过模板参数 `MaxLength` 指定，底层使用 `std::array<char, MaxLength+1>` 存储，并始终以 `\0` 结尾。
- **安全操作**：大部分接口使用边界检查和断言，确保不会越界访问。
- **兼容 C 风格字符串**：支持从 `const char*`、指定长度的字符串构造，并支持 `Raw()` 获取底层字符串。
- **字符串追加与查找**：支持 `+=` 追加和 `Find()` 查找子串。
- **完整的比较操作符支持**：支持 `==, !=, <, >, <=, >=` 运算符。

## 使用示例

```cpp
LibXR::String<32> s1("hello");
s1 += " world";
int idx = s1.Find("lo");  // 返回 3
auto sub = s1.Substr<5>(6);  // 从下标 6 开始截取 5 个字符的子串
```

## 接口说明

### 构造函数

- `String()`：构造空字符串。
- `String(const char* str)`：从 C 风格字符串构造。
- `String(const char* str, size_t len)`：从指定长度的字符串构造。

### 基本方法

- `const char* Raw() const`：获取底层 C 风格字符串。
- `size_t Length() const`：获取字符串当前长度。
- `void Clear()`：清空字符串。
- `int Find(const char* str) const`：查找子串位置，不存在返回 -1。
- `template <unsigned int SubStrLength> String<SubStrLength> Substr(size_t pos) const`：从指定位置提取子串。

### 操作符

- `+=`：追加 C 字符串。
- `[]`：索引访问字符（带边界断言）。
- 比较操作符：`==, !=, <, >, <=, >=` 均支持跨不同长度模板的 `String<N>`。
