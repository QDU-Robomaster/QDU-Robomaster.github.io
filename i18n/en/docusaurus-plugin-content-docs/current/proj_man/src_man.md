---
id: proj-man-source-man
title: Module Source Management
sidebar_position: 0
---

# Module Source Management

In the XRobot project, module functionalities are typically distributed across multiple Git repositories as "module repositories." While an official default source is provided, to support **private modules, custom components, internal mirrors, or acceleration services**, you can define multiple module sources.

This page introduces the multi-source module repository management mechanism of XRobot and how to use the `xrobot_src_man` command-line tool to flexibly configure, aggregate, and locate module repositories.

---

## Why Manage Module Sources?

- ✅ Slow network access to official repos? Add mirror or internal acceleration sources.
- ✅ Have internal modules? Add private `index.yaml` files with dedicated namespaces.
- ✅ Avoid naming conflicts? Each source has its own namespace—no interference.
- ✅ Need to upgrade or migrate modules? Same-named modules can come from different sources with flexible priority control.

---

## Basic Concepts

| Term              | Description                                                                 |
|-------------------|-----------------------------------------------------------------------------|
| **Module Source** | An `index.yaml` file describing multiple module repositories under a namespace |
| **sources.yaml**  | A local file listing multiple source entries including URLs and priorities   |
| **index.yaml**    | The actual module list and namespace definition, hosted publicly or locally  |

---

## 1. Quick Start: Using the Official Module Source

No configuration needed—uses the default source: [xrobot-modules/index.yaml](https://xrobot-org.github.io/xrobot-modules/index.yaml)

### Create a sources.yaml Template

```bash
xrobot_src_man create-sources
```

### List All Available Modules

```bash
xrobot_src_man list
```

Sample output:

```bash
Available modules:
  xrobot-org/BlinkLED   source: https://xrobot-org.github.io/xrobot-modules/index.yaml (actual namespace: xrobot-org)
```

---

## 2. Add a Private Module Source

You can add your own `index.yaml` to include private modules or mirrors.

### 1. Create `sources.yaml` and Add Multiple Sources

```bash
xrobot_src_man create-sources --output Modules/sources.yaml
```

Then edit it like this:

```yaml
sources:
  - url: https://xrobot-org.github.io/xrobot-modules/index.yaml
    priority: 0
  - url: https://your-domain.com/private-index.yaml
    priority: 1
```

### 2. Add a Local Private Source (Local Paths Supported)

```bash
xrobot_src_man add-source ./Modules/my-index.yaml --priority 1
```

---

## 3. Mirror / Intranet Acceleration Support

Some `index.yaml` files support the `mirror_of` field to indicate they mirror another source, for example:

```yaml
namespace: your-team
mirror_of: xrobot-org
modules:
  - https://git.your-company.com/BlinkLED.git
  - https://git.your-company.com/MySensor.git
```

---

## 4. Creating and Maintaining Custom index.yaml

You can create and maintain your own `index.yaml` to organize private modules.

### 1. Create an index.yaml Template

```bash
xrobot_src_man create-index --output Modules/my-index.yaml --namespace yourns
```

To mark it as a mirror:

```bash
xrobot_src_man create-index --output my-index.yaml --namespace yourns --mirror-of xrobot-org
```

### 2. Add Module Repositories to index.yaml

```bash
xrobot_src_man add-index https://github.com/yourorg/MyModule.git --index Modules/my-index.yaml
```

---

## 5. Query and Validate Modules

You can query module origins and URLs:

### List All Modules

```bash
xrobot_src_man list
```

### Get Address and Source of a Module

```bash
xrobot_src_man get yourns/MyModule
```

### Find a Module Across All Sources (Including Mirrors)

```bash
xrobot_src_man find yourns/MyModule
```
