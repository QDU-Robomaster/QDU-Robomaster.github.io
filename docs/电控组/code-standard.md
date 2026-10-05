---
id: ee-code-standard
title: 代码规范
slug: /电控组/code-standard
sidebar_position: 7
---

# 代码规范

C 板工程采用 C++20。命名规则在 `.clangd`，格式在 `.clang-format`；模块创建和 manifest 写法见 [XRobot 工程管理](https://xrobot.work/docs/proj_man)。

## 命名

| 对象 | 规则 | 示例 |
| --- | --- | --- |
| 普通变量、全局变量 | `lower_case` | `feedback_id` |
| 类成员 | `lower_case_` | `motor_yaw_` |
| 类、结构体、枚举类型 | `CamelCase` | `MotorFeedback` |
| 自由函数 | `lower_case` | `read_status` |
| 成员方法 | `CamelCase` | `GetFeedback` |
| 常量、枚举值、宏 | `UPPER_CASE` | `MAX_RETRY_COUNT` |

例如，下面的类展示成员与常量的命名：

```cpp
class MotorMonitor {
 public:
  static constexpr unsigned MAX_RETRY_COUNT = 3;

  bool HasFeedback() const { return has_feedback_; }

 private:
  bool has_feedback_ = false;
};
```

## 格式化

仓库脚本默认使用 clang-format 21.1.8，处理 `Modules/` 下的 C/C++ 文件。

```bash
# 只检查
bash tools/format_code.sh --check

# 修改格式
bash tools/format_code.sh
```

模块通常是独立仓库，格式化后也要在对应模块中查看差异。

## 参数与生成文件

电机型号、ID、总线、反向、PID 和几何参数写在机器人 YAML。模块只实现通用功能。

新增构造参数时，在模块构造函数中声明，并同步修改使用它的配置；配置按参数名填写。改完 YAML 后运行 `xrobot gen` 重新生成 `User/xrobot_main.hpp`，不直接维护生成头文件。

CubeMX 生成文件只在用户代码区添加应用代码，厂商驱动保持原样。板级对象和逻辑名称放在 `User/app_main.cpp`。

## 注释与接口

注释说明代码中看不出来的内容：单位、坐标系、设备时钟、缓冲区有效期、安装方向和特殊处理的原因。变量名已经能表达的操作不必再翻译一遍。

公开 Topic 字段还应写清无数据或超时后的行为。跨设备的接口修改同时检查接收端；发送结构能编译并不意味着旧接收端能正确解释。

## 日志

高频线程的逐帧日志保留开关或输出间隔。调试时先记录输入、状态和输出，磁盘写入、绘图等操作放到独立处理线程。

提交时把无关格式变化与功能修改分开，具体流程见[团队工作流](/git-collaboration)。

源码：[bsp-dev-c](https://github.com/QDU-Robomaster/bsp-dev-c)。
