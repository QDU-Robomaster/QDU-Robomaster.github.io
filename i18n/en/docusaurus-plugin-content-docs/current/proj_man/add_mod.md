---
id: proj-man-add-mod
title: Add Module
sidebar_position: 4
---

# Add Module

XRobot provides the `xrobot_add_mod` tool to:

- **Add remote module repositories** (appends to `modules.yaml` and pulls)
- **Add module instances** (appends to `xrobot.yaml` and enables code generation)

---

## 1. Add a Remote Module

You can quickly add a module by specifying its repository address:

```bash
xrobot_add_mod xrobot-org/BlinkLED@master
```

Example output:

```bash
[SUCCESS] Added repo module 'xrobot-org/BlinkLED@master' to Modules/modules.yaml
```

Then initialize the modules:

```bash
xrobot_init_mod
```

This will fetch all modules automatically:

```bash
[INFO] Cloning new module: xrobot-org/BlinkLED
Cloning into 'Modules/BlinkLED'...
remote: Enumerating objects: 37, done.
remote: Counting objects: 100% (37/37), done.
remote: Compressing objects: 100% (25/25), done.
remote: Total 37 (delta 11), reused 33 (delta 10), pack-reused 0 (from 0)
Receiving objects: 100% (37/37), 7.48 KiB | 3.74 MiB/s, done.
Resolving deltas: 100% (11/11), done.
Already on 'master'
Your branch is up to date with 'origin/master'.
[SUCCESS] All modules and their dependencies processed.
```

---

## 2. Add a Module Instance (for Code Generation)

Assuming the BlinkLED module is already pulled:

```bash
xrobot_add_mod BlinkLED
```

Sample output:

```bash
[SUCCESS] Appended module instance 'BlinkLED' as id 'BlinkLED_0' to User/xrobot.yaml
```

This will append a new entry to `xrobot.yaml`:

```yaml
modules:
- id: BlinkLED_0
  name: BlinkLED
  constructor_args:
    blink_cycle: 250
```

You can now generate the main function:

```bash
xrobot_gen_main
```

---

## 3. Custom Instance ID

The default instance ID is `ModuleName_Index`, such as `BlinkLED_0`. You can override it:

```bash
xrobot_add_mod BlinkLED --instance-id myled
```

---

## 4. Passing Other Module Instances as Arguments

You can pass other module instances as arguments to a module:

```yaml
modules:
- id: BlinkLED_0
  name: BlinkLED
  constructor_args:
    blink_cycle: 250
- id: TestModule_0
  name: TestModule
  constructor_args:
    test_arg5: '@BlinkLED_0'
```

The following code will be generated:

```cpp
static BlinkLED BlinkLED_0(hw, appmgr, 250);
static TestModule TestModule_0(hw, appmgr, BlinkLED_0);
```

The syntax`'@obj->GetMember()'` or `'@obj.member'`is also supported, allowing access to members of other module instances.

---

## 5. Configuration File Locations

| Config Type       | Default Path             | Description                             |
|-------------------|--------------------------|-----------------------------------------|
| Module Repository | `Modules/modules.yaml`   | Stores module addresses and version info|
| Instance Config   | `User/xrobot.yaml`       | Stores module instance IDs and parameters|
