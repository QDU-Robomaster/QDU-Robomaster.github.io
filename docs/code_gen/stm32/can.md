---
id: stm32-code-gen-can
title: CAN与CAN FD
sidebar_position: 10
---

# CAN 与 CAN FD

LibXR 支持标准 CAN 和 CAN FD。在 STM32CubeMX 中需要启用相应的外设和中断，并至少为标准帧和扩展帧分配一个过滤器。

## 默认过滤器与FIFO配置

LibXR会为每个CAN/CANFD的标准帧和扩展帧各配置一个默认过滤器，允许所有数据帧通过。

对于不同CAN/CANFD数量的平台，FIFO的配置如下：

| 经典CAN | CAN1 | CAN1+CAN2 | CAN1+CAN2+CAN3 |
| ------- | ---- | --------- | -------------- |
| FIFO0   | CAN1 | CAN1      | CAN1+CAN2      |
| FIFO1   | N/A  | CAN2      | CAN3           |

| CAN FD | CANFD1 | CANFD1+CANFD2 | CANFD1+CANFD2+CANFD3 |
| ------ | ------ | ------------- | -------------------- |
| FIFO0  | CANFD1 | CANFD1        | CANFD1               |
| FIFO1  | N/A    | CANFD2        | CANFD2+CANFD3        |

## 示例

第二个参数表示发送队列大小，用于缓冲待发送的数据帧。

```cpp
STM32CAN can1(&hcan1, 5);
STM32CANFD fdcan1(&hfdcan1, 5);
```

## 配置文件

代码生成后，会在 `User/libxr_config.yaml` 中添加如下配置：

```yaml
CAN:
  CAN1:
    queue_size: 5

FDCAN:
  FDCAN1:
    queue_size: 5
```

- `queue_size`：发送队列的大小，用于缓存待发送的 CAN/FDCAN 数据帧。

可直接修改该配置文件。如需应用更改，请执行以下命令重新生成代码：  
`xr_cubemx_cfg -d .`  
或  
`xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp`
