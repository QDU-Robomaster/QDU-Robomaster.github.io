---
id: env-setup-linux
title: Linux Environment Setup
sidebar_position: 4
---

# Linux Environment Setup

On Linux, you just need to install the necessary dependencies.

## Installing Dependencies

```bash
sudo apt update
sudo apt install -y git python3 python3-pip cmake tar xz-utils wget pipx ninja-build libwpa-client-dev libnm-dev libudev-dev gcc g++ gdb
```

## Using Clang

You can specify the C/C++ compiler directly with CMake—no special configuration is required.
