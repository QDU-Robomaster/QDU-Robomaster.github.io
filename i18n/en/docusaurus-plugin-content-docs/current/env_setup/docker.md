---
id: env-setup-docker
title: Docker Environment Setup
sidebar_position: 5
---

This page introduces how to use the Docker images provided in [this repository](https://github.com/xrobot-org/Docker-Image).

There are five available Docker images:

* `docker-image-stm32`: Docker image tailored for STM32 development
* `docker-image-esp32`: Docker image tailored for ESP32 development
* `docker-image-ch32-riscv`: Docker image tailored for CH32 RISC-V Series
* `docker-image-linux`: Docker image tailored for Linux development
* `docker-image-webots`: Docker image tailored for Webots simulation

## ghcr.io

GitHub Container Registry – recommended for use in GitHub Actions

* docker-image: `docker pull ghcr.io/xrobot-org/docker-image:main`
* docker-image-stm32: `docker pull ghcr.io/xrobot-org/docker-image-stm32:main`
* docker-image-esp32: `docker pull ghcr.io/xrobot-org/docker-image-esp32:main`
* docker-image-ch32-riscv: `docker pull ghcr.io/xrobot-org/docker-image-ch32-riscv:main`
* docker-image-linux: `docker pull ghcr.io/xrobot-org/docker-image-linux:main`
* docker-image-webots: `docker pull ghcr.io/xrobot-org/docker-image-webots:main`

## Docker Hub

Docker Hub images – recommended for local development

* docker-image: `docker pull xrimage/xrimage`
* docker-image-stm32: `docker pull xrimage/xrimage-stm32`
* docker-image-esp32: `docker pull xrimage/xrimage-esp32`
* docker-image-ch32-riscv: `docker pull xrimage/xrimage-ch32-riscv`
* docker-image-linux: `docker pull xrimage/xrimage-linux`
* docker-image-webots: `docker pull xrimage/xrimage-webots`

## Running Docker Images

```bash
docker run -it <image-name>
