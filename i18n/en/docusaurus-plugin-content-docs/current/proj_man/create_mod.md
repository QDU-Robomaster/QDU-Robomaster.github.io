---
id: proj-man-create-mod
title: Quick Module Creation
sidebar_position: 2
---

# Quick Module Creation

XRobot provides a module generator tool `xrobot_create_mod` that lets you quickly create a module directory, a standard header with a `MANIFEST`, and a README. It's ideal for beginners to get started with module development.

---

## 1. Create a Module

Just one command:

```bash
xrobot_create_mod MySensor --desc "IMU interface module" --hw imu scl sda
```

Example output:

```bash
[OK] Module MySensor generated at Modules/MySensor
```

You will get the following structure:

```bash
Modules/
└── MySensor/
    ├── MySensor.hpp        # Module header with MANIFEST
    ├── README.md           # Auto-generated documentation
    ├── CMakeLists.txt      # Build configuration
    └── .github/workflows/build.yml # GitHub CI workflow
```

---

## 2. View Module Info

After creation, you can inspect the module using `xrobot_mod_parser`:

```bash
xrobot_mod_parser --path ./Modules/MySensor/
```

Example output:

```bash
=== Module: MySensor.hpp ===
Description       : IMU interface module

Constructor Args  :
Required Hardware : imu, scl, sda
Depends           : None
```

---

## 3. MANIFEST Format Explanation

The module metadata is written in a special block inside the header file:

```yaml
/* === MODULE MANIFEST V2 ===
module_description: IMU interface module
constructor_args: []
template_args: []
required_hardware:
  - imu
  - scl
  - sda
depends: []
=== END MANIFEST === */
```

This MANIFEST is the core metadata source for generating main functions, docs, and dependency trees.

---

## 4. More Argument Options

You can also add constructor args, template args, and dependencies:

```bash
xrobot_create_mod PIDController   --desc "A generic PID controller"   --hw input output   --constructor kp=1.0 ki=0.2 kd=0.0   --template T=float   --depends MySensor
```

---

## 5. Constructor & Template Arguments

- `--constructor kp=1.0 ki=0.2` will be automatically written into both MANIFEST and README
- `--template T=float` supports template parameters
- All fields support automatic type inference (int, float, bool)

---

## 6. CMake and CI Configuration

The generated module includes:

- A build script compatible with `Modules/CMakeLists.txt`
- A GitHub Actions CI workflow in `build.yml`

You can freely customize these templates as needed.
