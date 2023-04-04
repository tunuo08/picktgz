# picktgz

这是一个用于从 'package-lock.json' 或者 'yarn.lock' 文件中提取并下载 '.tgz' 依赖包的命令行工具。

## 安装

```bash
npm install -g picktgz
```

## 用法

```bash
picktgz [package-lock.json] [--add-sh]
```

如果没有指定 'package-lock.json' 文件路径，将默认使用当前目录下的 'package-lock.json' 文件。
使用 '--add-sh' 选项可以将名为 'npmPublish.sh' 的脚本复制到 'modulestgz' 文件夹中。

## 示例

1. 使用当前目录下的 'package-lock.json' 文件：

```bash
picktgz
```

2. 使用指定路径的"package-lock.json" 文件：

```bash
picktgz /path/to/package-lock.json
```

3. 使用当前目录下的 'package-lock.json' 文件，并将 npmPublish.sh 脚本复制到 'modulestgz' 文件夹中：

```bash
picktgz --add-sh
```

## 注意事项

- 运行命令时，确保 'package-lock.json' 文件存在于指定的路径或当前目录下。
- 'modulestgz' 文件夹将创建在命令行执行的当前目录中。如果该文件夹已经存在，新的 '.tgz' 包将被下载到这个文件夹中，已有的
  '.tgz' 包将被跳过。

## 支持

如果您在使用 'picktgz' 时遇到问题或需要帮助，请提交 issue 到我们的 GitHub 仓库。