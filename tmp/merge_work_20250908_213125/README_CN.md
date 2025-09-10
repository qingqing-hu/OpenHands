
<a name="readme-top"></a>

<div align="center">
  <img src="./docs/static/img/logo.png" alt="Logo" width="200">
  <h1 align="center">OpenHands: 少写代码，多做事</h1>
</div>


<div align="center">
  <a href="https://github.com/All-Hands-AI/OpenHands/graphs/contributors"><img src="https://img.shields.io/github/contributors/All-Hands-AI/OpenHands?style=for-the-badge&color=blue" alt="Contributors"></a>
  <a href="https://github.com/All-Hands-AI/OpenHands/stargazers"><img src="https://img.shields.io/github/stars/All-Hands-AI/OpenHands?style=for-the-badge&color=blue" alt="Stargazers"></a>
  <a href="https://github.com/All-Hands-AI/OpenHands/blob/main/LICENSE"><img src="https://img.shields.io/github/license/All-Hands-AI/OpenHands?style=for-the-badge&color=blue" alt="MIT License"></a>
  <br/>
  <a href="https://join.slack.com/t/openhands-ai/shared_invite/zt-3847of6xi-xuYJIPa6YIPg4ElbDWbtSA"><img src="https://img.shields.io/badge/Slack-Join%20Us-red?logo=slack&logoColor=white&style=for-the-badge" alt="加入我们的Slack社区"></a>
  <a href="https://discord.gg/ESHStjSjD4"><img src="https://img.shields.io/badge/Discord-Join%20Us-purple?logo=discord&logoColor=white&style=for-the-badge" alt="加入我们的Discord社区"></a>
  <a href="https://github.com/All-Hands-AI/OpenHands/blob/main/CREDITS.md"><img src="https://img.shields.io/badge/Project-Credits-blue?style=for-the-badge&color=FFE165&logo=github&logoColor=white" alt="致谢"></a>
  <br/>
  <a href="https://docs.all-hands.dev/usage/getting-started"><img src="https://img.shields.io/badge/Documentation-000?logo=googledocs&logoColor=FFE165&style=for-the-badge" alt="查看文档"></a>
  <a href="https://arxiv.org/abs/2407.16741"><img src="https://img.shields.io/badge/Paper%20on%20Arxiv-000?logoColor=FFE165&logo=arxiv&style=for-the-badge" alt="Arxiv论文"></a>
  <a href="https://docs.google.com/spreadsheets/d/1wOUdFCMyY6Nt0AIqF705KN4JKOWgeI4wUGUP60krXXs/edit?gid=0#gid=0"><img src="https://img.shields.io/badge/Benchmark%20score-000?logoColor=FFE165&logo=huggingface&style=for-the-badge" alt="评估基准分数"></a>
  <hr>
</div>

欢迎使用OpenHands（前身为OpenDevin），这是一个由AI驱动的软件开发代理平台。

OpenHands代理可以完成人类开发者能做的任何事情：修改代码、运行命令、浏览网页、调用API，甚至从StackOverflow复制代码片段。

在[docs.all-hands.dev](https://docs.all-hands.dev)了解更多信息，或[注册OpenHands Cloud](https://app.all-hands.dev)开始使用。

> [!IMPORTANT]
> 在工作中使用OpenHands？我们很想与您交流！填写
> [这份简短表格](https://docs.google.com/forms/d/e/1FAIpQLSet3VbGaz8z32gW9Wm-Grl4jpt5WgMXPgJ4EDPVmCETCBpJtQ/viewform)
> 加入我们的设计合作伙伴计划，您将获得商业功能的早期访问权限，并有机会对我们的产品路线图提供意见。

![应用截图](./docs/static/img/screenshot.png)

## ☁️ OpenHands Cloud
开始使用OpenHands的最简单方式是在[OpenHands Cloud](https://app.all-hands.dev)上，
新用户可获得$50的免费额度。

## 💻 在本地运行OpenHands

OpenHands也可以使用Docker在本地系统上运行。
查看[运行OpenHands](https://docs.all-hands.dev/usage/installation)指南了解
系统要求和更多信息。

> [!WARNING]
> 在公共网络上？请参阅我们的[强化Docker安装指南](https://docs.all-hands.dev/usage/runtimes/docker#hardened-docker-installation)
> 通过限制网络绑定和实施其他安全措施来保护您的部署。


```bash
<<<<<<< /Users/yddyf/Documents/code/openhands8/OpenHands-main-3/README_CN.md
docker pull docker.all-hands.dev/all-hands-ai/runtime:0.50-nikolaik
||||||| /tmp/source-analysis/OpenHands-main/README_CN.md
docker pull docker.all-hands.dev/all-hands-ai/runtime:0.55-nikolaik
=======
docker pull docker.all-hands.dev/all-hands-ai/runtime:0.51-nikolaik
>>>>>>> /tmp/colleague-analysis/colleague-code/README_CN.md

docker run -it --rm --pull=always \
<<<<<<< /Users/yddyf/Documents/code/openhands8/OpenHands-main-3/README_CN.md
    -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.50-nikolaik \
||||||| /tmp/source-analysis/OpenHands-main/README_CN.md
    -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.55-nikolaik \
=======
    -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.51-nikolaik \
>>>>>>> /tmp/colleague-analysis/colleague-code/README_CN.md
    -e LOG_ALL_EVENTS=true \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v ~/.openhands:/.openhands \
    -p 3000:3000 \
    --add-host host.docker.internal:host-gateway \
    --name openhands-app \
<<<<<<< /Users/yddyf/Documents/code/openhands8/OpenHands-main-3/README_CN.md
    docker.all-hands.dev/all-hands-ai/openhands:0.50
||||||| /tmp/source-analysis/OpenHands-main/README_CN.md
    docker.all-hands.dev/all-hands-ai/openhands:0.55
=======
    docker.all-hands.dev/all-hands-ai/openhands:0.51
>>>>>>> /tmp/colleague-analysis/colleague-code/README_CN.md
```

> **注意**: 如果您在0.44版本之前使用过OpenHands，您可能需要运行 `mv ~/.openhands-state ~/.openhands` 来将对话历史迁移到新位置。

您将在[http://localhost:3000](http://localhost:3000)找到运行中的OpenHands！

打开应用程序时，您将被要求选择一个LLM提供商并添加API密钥。
[Anthropic的Claude Sonnet 4](https://www.anthropic.com/api)（`anthropic/claude-sonnet-4-20250514`）
效果最佳，但您还有[许多选择](https://docs.all-hands.dev/usage/llms)。

## 💡 运行OpenHands的其他方式

> [!CAUTION]
> OpenHands旨在由单个用户在其本地工作站上运行。
> 它不适合多租户部署，即多个用户共享同一实例。没有内置的身份验证、隔离或可扩展性。
>
> 如果您有兴趣在多租户环境中运行OpenHands，请
> [与我们联系](https://docs.google.com/forms/d/e/1FAIpQLSet3VbGaz8z32gW9Wm-Grl4jpt5WgMXPgJ4EDPVmCETCBpJtQ/viewform)
> 了解高级部署选项。

您还可以[将OpenHands连接到本地文件系统](https://docs.all-hands.dev/usage/runtimes/docker#connecting-to-your-filesystem)，
以可编程的[无头模式](https://docs.all-hands.dev/usage/how-to/headless-mode)运行OpenHands，
通过[友好的CLI](https://docs.all-hands.dev/usage/how-to/cli-mode)与其交互，
或使用[GitHub Action](https://docs.all-hands.dev/usage/how-to/github-action)在标记的问题上运行它。

访问[运行OpenHands](https://docs.all-hands.dev/usage/installation)获取更多信息和设置说明。

如果您想修改OpenHands源代码，请查看[Development.md](https://github.com/All-Hands-AI/OpenHands/blob/main/Development.md)。

遇到问题？[故障排除指南](https://docs.all-hands.dev/usage/troubleshooting)可以提供帮助。

## 📖 文档
  <a href="https://deepwiki.com/All-Hands-AI/OpenHands"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki" title="DeepWiki自动生成文档"></a>

要了解有关项目的更多信息，以及使用OpenHands的技巧，
请查看我们的[文档](https://docs.all-hands.dev/usage/getting-started)。

在那里，您将找到有关如何使用不同LLM提供商、
故障排除资源和高级配置选项的资源。

## 🤝 如何加入社区

OpenHands是一个社区驱动的项目，我们欢迎每个人的贡献。我们大部分沟通
通过Slack进行，因此这是开始的最佳场所，但我们也很乐意您通过Discord或Github与我们联系：

- [加入我们的Slack工作空间](https://join.slack.com/t/openhands-ai/shared_invite/zt-3847of6xi-xuYJIPa6YIPg4ElbDWbtSA) - 这里我们讨论研究、架构和未来发展。
- [加入我们的Discord服务器](https://discord.gg/ESHStjSjD4) - 这是一个社区运营的服务器，用于一般讨论、问题和反馈。
- [阅读或发布Github问题](https://github.com/All-Hands-AI/OpenHands/issues) - 查看我们正在处理的问题，或添加您自己的想法。

在[COMMUNITY.md](./COMMUNITY.md)中了解更多关于社区的信息，或在[CONTRIBUTING.md](./CONTRIBUTING.md)中找到有关贡献的详细信息。

## 📈 进展

在[这里](https://github.com/orgs/All-Hands-AI/projects/1)查看OpenHands月度路线图（每月月底在维护者会议上更新）。

<p align="center">
  <a href="https://star-history.com/#All-Hands-AI/OpenHands&Date">
    <img src="https://api.star-history.com/svg?repos=All-Hands-AI/OpenHands&type=Date" width="500" alt="Star History Chart">
  </a>
</p>

## 📜 许可证

根据MIT许可证分发。有关更多信息，请参阅[`LICENSE`](./LICENSE)。

## 🙏 致谢

OpenHands由大量贡献者构建，每一份贡献都备受感谢！我们还借鉴了其他开源项目，对他们的工作深表感谢。

有关OpenHands中使用的开源项目和许可证列表，请参阅我们的[CREDITS.md](./CREDITS.md)文件。

## 📚 引用

```
@misc{openhands,
      title={{OpenHands: An Open Platform for AI Software Developers as Generalist Agents}},
      author={Xingyao Wang and Boxuan Li and Yufan Song and Frank F. Xu and Xiangru Tang and Mingchen Zhuge and Jiayi Pan and Yueqi Song and Bowen Li and Jaskirat Singh and Hoang H. Tran and Fuqiang Li and Ren Ma and Mingzhang Zheng and Bill Qian and Yanjun Shao and Niklas Muennighoff and Yizhe Zhang and Binyuan Hui and Junyang Lin and Robert Brennan and Hao Peng and Heng Ji and Graham Neubig},
      year={2024},
      eprint={2407.16741},
      archivePrefix={arXiv},
      primaryClass={cs.SE},
      url={https://arxiv.org/abs/2407.16741},
}
```
