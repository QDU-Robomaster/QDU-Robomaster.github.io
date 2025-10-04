---
id: core-color
title: Terminal Colors and Formatting
sidebar_position: 6
---

# Terminal Colors and Formatting

This module defines common formatting enums and ANSI escape sequences for terminal output. It supports text styles like bold, colored text, and background color, making it suitable for serial debug terminals, logging systems, and colored output.

## Text Format: `Format`

```cpp
enum class Format : uint8_t {
  NONE = 0, RESET, BOLD, DARK, UNDERLINE, BLINK, REVERSE, CONCEALED, CLEAR_LINE, COUNT
};
```

- `NONE`: No formatting
- `RESET`: Reset all styles
- `BOLD`: Bold text
- `DARK`: Dim text
- `UNDERLINE`: Underlined text
- `BLINK`: Blinking text
- `REVERSE`: Inverted foreground/background
- `CONCEALED`: Hidden text
- `CLEAR_LINE`: Clear entire line

Corresponding ANSI strings: `LIBXR_FORMAT_STR[]`

## Font Color: `Font`

```cpp
enum class Font : uint8_t {
  NONE = 0, BLACK, RED, GREEN, YELLOW, BLUE, MAGENTA, CYAN, WHITE, COUNT
};
```

Corresponding ANSI strings: `LIBXR_FONT_STR[]`

## Background Color: `Background`

```cpp
enum class Background : uint8_t {
  NONE = 0, BLACK, RED, GREEN, YELLOW, BLUE, MAGENTA, CYAN, WHITE, COUNT
};
```

Corresponding ANSI strings: `LIBXR_BACKGROUND_STR[]`

## Bold Style: `Bold`

```cpp
enum class Bold : uint8_t {
  NONE = 0, YELLOW, RED, ON_RED, COUNT
};
```

Simplified bold color styles, e.g.:

- `YELLOW`: Bold yellow
- `RED`: Bold red
- `ON_RED`: Bold white on red background

Corresponding ANSI strings: `LIBXR_BOLD_STR[]`

## Example

```cpp
std::cout << LIBXR_FORMAT_STR[(int)Format::BOLD]
          << LIBXR_FONT_STR[(int)Font::GREEN]
          << "This is bold green text!"
          << LIBXR_FORMAT_STR[(int)Format::RESET];
```

This prints bold green text.

---

This module can be combined with terminal utilities, debug output, or logging systems to create clear and readable colored output.
