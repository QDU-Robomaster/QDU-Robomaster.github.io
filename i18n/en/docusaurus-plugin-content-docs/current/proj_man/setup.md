---
id: proj-man-setup
title: One-Click Setup
sidebar_position: 5
---

# One-Click Setup

XRobot provides an automated tool `xrobot_setup` to complete the following setup tasks in one command:

- Check if configuration files exist (`modules.yaml` / `sources.yaml`)
- Fetch all module repositories
- Automatically generate the main function code (`xrobot_main.hpp`)
- Generate build configuration (`Modules/CMakeLists.txt`)

---

## 1. Quick Start

Just one command:

```bash
$ xrobot_setup
Starting XRobot auto-configuration...
[INFO] Created default Modules/modules.yaml
Please edit this file; each line should be a full module name like:
  - xrobot-org/BlinkLED
  - your-namespace/YourModule@dev
[INFO] Created default Modules/sources.yaml
Please configure sources index.yaml for official or custom/private mirrors.
Default official source already included.

$ xrobot_setup
Starting XRobot auto-configuration...
[EXEC] xrobot_init_mod --config Modules/modules.yaml --directory Modules --sources Modules/sources.yaml
[INFO] Cloning new module: xrobot-org/BlinkLED
Cloning into 'Modules/BlinkLED'...
remote: Enumerating objects: 37, done.
remote: Counting objects: 100% (37/37), done.
remote: Compressing objects: 100% (25/25), done.
remote: Total 37 (delta 11), reused 33 (delta 10), pack-reused 0 (from 0)
Receiving objects: 100% (37/37), 7.48 KiB | 2.49 MiB/s, done.
Resolving deltas: 100% (11/11), done.
[SUCCESS] All modules and their dependencies processed.
[INFO] Created default Modules/CMakeLists.txt: Modules/CMakeLists.txt
[EXEC] xrobot_gen_main --output User/xrobot_main.hpp
Discovered modules: BlinkLED
[INFO] Successfully parsed manifest for BlinkLED
[INFO] Writing configuration to User/xrobot.yaml
[SUCCESS] Generated entry file: User/xrobot_main.hpp

All done! Main function generated at: User/xrobot_main.hpp
```

---

## 2. Automated Steps

| Step                  | Description                                                                          |
|-----------------------|--------------------------------------------------------------------------------------|
| Initialize config     | Automatically generate `Modules/modules.yaml` and `sources.yaml` if not exist       |
| Fetch modules         | Run `xrobot_init_mod` to download all module repositories listed in modules.yaml    |
| Generate main function| Run `xrobot_gen_main` to generate main function header from `xrobot.yaml`           |
| Build config          | Automatically generate `Modules/CMakeLists.txt` with all module build files included|

---

## 3. Default File Structure

After execution, the following structure will be created:

```bash
Modules/
├── BlinkLED/
│   ├── BlinkLED.hpp
│   ├── CMakeLists.txt
├── modules.yaml
├── sources.yaml
├── CMakeLists.txt  <-- Auto-generated global module build entry

User/
├── xrobot.yaml      <-- Module instance configuration
├── xrobot_main.hpp  <-- Auto-generated main function entry
```

---

## 4. Custom Configuration Path (Optional)

You can specify the config path manually:

```bash
xrobot_setup --config User/xrobot.yaml
```
