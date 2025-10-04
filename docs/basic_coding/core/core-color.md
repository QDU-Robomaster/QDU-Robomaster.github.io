---
id: core-color
title: 终端颜色与格式
sidebar_position: 6
---

# 终端颜色与格式

本模块定义了终端打印时常用的格式控制枚举和 ANSI 转义序列，支持文本加粗、颜色设置、背景色等，适用于串口调试终端、日志系统、彩色输出等场景。

## 文本格式 Format

```cpp
enum class Format : uint8_t {
  NONE = 0, RESET, BOLD, DARK, UNDERLINE, BLINK, REVERSE, CONCEALED, CLEAR_LINE, COUNT
};
```

- `NONE`: 无格式
- `RESET`: 重置所有格式
- `BOLD`: 加粗
- `DARK`: 暗色字体
- `UNDERLINE`: 下划线
- `BLINK`: 闪烁
- `REVERSE`: 前景/背景反转
- `CONCEALED`: 隐藏
- `CLEAR_LINE`: 清除整行

对应 ANSI 转义字符串：`LIBXR_FORMAT_STR[]`

## 字体颜色 Font

```cpp
enum class Font : uint8_t {
  NONE = 0, BLACK, RED, GREEN, YELLOW, BLUE, MAGENTA, CYAN, WHITE, COUNT
};
```

对应 ANSI 字符串：`LIBXR_FONT_STR[]`

## 背景颜色 Background

```cpp
enum class Background : uint8_t {
  NONE = 0, BLACK, RED, GREEN, YELLOW, BLUE, MAGENTA, CYAN, WHITE, COUNT
};
```

对应 ANSI 字符串：`LIBXR_BACKGROUND_STR[]`

## 粗体样式 Bold

```cpp
enum class Bold : uint8_t {
  NONE = 0, YELLOW, RED, ON_RED, COUNT
};
```

简化常用彩色粗体样式输出，例如：

- `YELLOW`: 黄色加粗
- `RED`: 红色加粗
- `ON_RED`: 红底白字加粗

对应 ANSI 字符串：`LIBXR_BOLD_STR[]`

## 使用示例

```cpp
std::cout << LIBXR_FORMAT_STR[(int)Format::BOLD]
          << LIBXR_FONT_STR[(int)Font::GREEN]
          << "This is bold green text!"
          << LIBXR_FORMAT_STR[(int)Format::RESET];
```

效果为绿色加粗文本。

---

本模块可配合终端类、调试输出类、日志系统使用，用于构建清晰、可读性强的彩色输出。
