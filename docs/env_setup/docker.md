---
id: env-setup-docker
title: Docker 环境配置
sidebar_position: 5
---

此界面介绍了如何使用[此仓库](https://github.com/xrobot-org/Docker-Image)中发布的Docker镜像。

提供的Docker镜像总共有五种：

* docker-image-stm32： 针对STM32的docker镜像
* docker-image-esp32： 针对ESP32的docker镜像
* docker-image-ch32-riscv: 针对CH32 RISC-V系列的docker镜像
* docker-image-linux： 针对Linux的docker镜像
* docker-image-webots： 针对Webots仿真的docker镜像

## ghcr.io

github的容器仓库，推荐在github actions中使用

* docker-image-stm32: `docker pull ghcr.io/xrobot-org/docker-image-stm32:main`
* docker-image-esp32: `docker pull ghcr.io/xrobot-org/docker-image-esp32:main`
* docker-image-ch32-riscv: `docker pull ghcr.io/xrobot-org/docker-image-ch32-riscv:main`
* docker-image-linux: `docker pull ghcr.io/xrobot-org/docker-image-linux:main`
* docker-image-webots: `docker pull ghcr.io/xrobot-org/docker-image-webots:main`

## Docker Hub

docker hub的镜像，推荐在本地使用

* docker-image-stm32: `docker pull xrimage/xrimage-stm32`
* docker-image-esp32: `docker pull xrimage/xrimage-esp32`
* docker-image-ch32-riscv: `docker pull xrimage/xrimage-ch32-riscv`
* docker-image-linux: `docker pull xrimage/xrimage-linux`
* docker-image-webots: `docker pull xrimage/xrimage-webots`

## 运行Docker镜像

```bash
docker run -it 镜像名
```
