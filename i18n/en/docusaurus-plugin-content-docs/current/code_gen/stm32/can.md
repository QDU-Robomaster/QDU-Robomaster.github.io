---
id: stm32-code-gen-can
title: CAN & CAN FD
sidebar_position: 10
---

# CAN & CAN FD

LibXR supports both standard CAN and CAN FD. You need to enable the respective peripherals and interrupts in STM32CubeMX, and allocate at least one filter for both standard and extended frames.

## Default Filters and FIFO Configuration

LibXR configures one default filter for each CAN/CAN FD controller, separately for standard and extended frames, allowing all data frames to pass through.

The FIFO configuration for different numbers of CAN/CAN FD controllers is as follows:

| Classic CAN | CAN1 | CAN1+CAN2 | CAN1+CAN2+CAN3 |
| ----------- | ---- | --------- | -------------- |
| FIFO0       | CAN1 | CAN1      | CAN1+CAN2      |
| FIFO1       | N/A  | CAN2      | CAN3           |

| CAN FD | CANFD1 | CANFD1+CANFD2 | CANFD1+CANFD2+CANFD3 |
| ------ | ------ | ------------- | -------------------- |
| FIFO0  | CANFD1 | CANFD1        | CANFD1               |
| FIFO1  | N/A    | CANFD2        | CANFD2+CANFD3        |

## Example

The second parameter represents the transmission queue size, which buffers outgoing messages.

```cpp
STM32CAN can1(&hcan1, 5);
STM32CANFD fdcan1(&hfdcan1, 5);
```

## Configuration File

After code generation, the following CAN-related configuration will be added to `User/libxr_config.yaml`:

```yaml
CAN:
  CAN1:
    queue_size: 5

FDCAN:
  FDCAN1:
    queue_size: 5
```

- `queue_size`: The size of the transmit queue for the CAN/FDCAN interface.

To apply changes, modify this file directly and run:  
`xr_cubemx_cfg -d .`  
or  
`xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp`
