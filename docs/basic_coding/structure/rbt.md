---
id: rbtree
title: 红黑树
sidebar_position: 6
---

# 红黑树（RBTree）

`LibXR::RBTree<Key>` 是一个泛型、线程安全的红黑树实现，支持插入、删除、查找、遍历操作，适用于键值索引、自动排序、内存资源映射等嵌入式数据结构场景。

## 核心特性

- 自平衡二叉查找树，插入/删除复杂度 O(log n)
- 支持泛型 Key 和 Value
- 提供模板化节点类 `Node<T>` 和抽象 `BaseNode`
- 所有操作使用 `Mutex` 保护，线程安全
- 可遍历与中序迭代支持
- 内部使用传统红黑树旋转与颜色修复机制

## 类结构

- `BaseNode`：抽象节点类型，包含 key、颜色、父子指针、大小信息
- `Node<Data>`：模板节点类型，封装用户数据
- `RBTree<Key>`：红黑树容器，支持泛型 Key 比较

## 接口说明

### 构造与初始化

```cpp
RBTree<Key> tree(compare_fun);
```

- `compare_fun` 为自定义比较函数指针 `int(const Key&, const Key&)`

### 插入与删除

```cpp
void Insert(BaseNode& node, Key&& key);
void Delete(BaseNode& node);
```

- 插入节点时需设定 Key，自动修复树平衡
- 删除节点支持任意节点位置，自动修复树结构

### 查找节点

```cpp
template <typename Data>
Node<Data>* Search(const Key& key);
```

- 返回键为 `key` 的节点指针，若无则为 nullptr

### 遍历节点

```cpp
template <typename Data, typename Func>
ErrorCode Foreach(Func func);
```

- 中序遍历节点，对每个 `Node<Data>` 执行 func 回调

### 迭代接口

```cpp
Node<Data>* ForeachDisc(Node<Data>* node);
```

- 依次返回中序下一个节点，初始调用时传入 nullptr

### 节点定义示例

```cpp
RBTree<int> tree(cmp);
RBTree<int>::Node<std::string> n1("hello");
tree.Insert(n1, 42);
```

## 注意事项

- 所有操作为线程安全，但需注意节点生命周期由用户控制
- 节点类型需固定在使用前明确
- 节点大小支持运行时校验，防止误类型访问

## 应用场景

- 有序对象存储与检索
- 配置项查找（如字符串键映射）
- 映射类结构（如资源 ID 与对象映射）
