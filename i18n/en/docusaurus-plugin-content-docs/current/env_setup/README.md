---
id: env-setup
title: Environment Setup
sidebar_position: 4
---

# Environment Setup

This page will guide you through configuring and using LibXR, CodeGenerator, and XRobot on your local system.

## Supported Platforms

LibXR itself is a C++ library that does not depend on any specific operating system. It requires the C++17 standard and the standard C++ library. It can run on bare-metal environments or with an RTOS.

CodeGenerator and XRobot are Python-based packages that require Python 3 and a working `pip3` environment.

## Installation

### LibXR

Clone the repository directly:

```bash
git clone https://github.com/Jiu-xiao/libxr.git
```

Or use Git submodules or subtree (recommended for integration):

```bash
git submodule add https://github.com/Jiu-xiao/libxr.git libxr
```

### CodeGenerator (libxr) and XRobot

Install via pip:

```bash
pip install libxr xrobot
```

Or install using pipx:

```bash
### Windows
python -m pip install --user pipx
python -m pipx ensurepath
pipx install libxr xrobot
pipx ensurepath
# Restart your terminal

### Linux
sudo apt install pipx
pipx install libxr xrobot
pipx ensurepath
# Restart your terminal
```

Please note that you should not use both pip and pipx to install the same package at the same time. If you do, your environment variables may become confused and cause version conflicts.
