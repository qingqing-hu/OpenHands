<a name="readme-top"></a>

<div align="center">
  <img src="./docs/static/img/logo.png" alt="Logo" width="200">
  <h1 align="center">OpenHands: コードを減らして、もっと作ろう</h1>
</div>

<div align="center">
  <a href="https://github.com/All-Hands-AI/OpenHands/graphs/contributors"><img src="https://img.shields.io/github/contributors/All-Hands-AI/OpenHands?style=for-the-badge&color=blue" alt="Contributors"></a>
  <a href="https://github.com/All-Hands-AI/OpenHands/stargazers"><img src="https://img.shields.io/github/stars/All-Hands-AI/OpenHands?style=for-the-badge&color=blue" alt="Stargazers"></a>
  <a href="https://github.com/All-Hands-AI/OpenHands/blob/main/LICENSE"><img src="https://img.shields.io/github/license/All-Hands-AI/OpenHands?style=for-the-badge&color=blue" alt="MIT License"></a>
  <br/>
  <a href="https://join.slack.com/t/openhands-ai/shared_invite/zt-3847of6xi-xuYJIPa6YIPg4ElbDWbtSA"><img src="https://img.shields.io/badge/Slack-Join%20Us-red?logo=slack&logoColor=white&style=for-the-badge" alt="Slackコミュニティに参加"></a>
  <a href="https://discord.gg/ESHStjSjD4"><img src="https://img.shields.io/badge/Discord-Join%20Us-purple?logo=discord&logoColor=white&style=for-the-badge" alt="Discordコミュニティに参加"></a>
  <a href="https://github.com/All-Hands-AI/OpenHands/blob/main/CREDITS.md"><img src="https://img.shields.io/badge/Project-Credits-blue?style=for-the-badge&color=FFE165&logo=github&logoColor=white" alt="クレジット"></a>
  <br/>
  <a href="https://docs.all-hands.dev/usage/getting-started"><img src="https://img.shields.io/badge/Documentation-000?logo=googledocs&logoColor=FFE165&style=for-the-badge" alt="ドキュメントを見る"></a>
  <a href="https://arxiv.org/abs/2407.16741"><img src="https://img.shields.io/badge/Paper%20on%20Arxiv-000?logoColor=FFE165&logo=arxiv&style=for-the-badge" alt="Arxiv論文"></a>
  <a href="https://docs.google.com/spreadsheets/d/1wOUdFCMyY6Nt0AIqF705KN4JKOWgeI4wUGUP60krXXs/edit?gid=0#gid=0"><img src="https://img.shields.io/badge/Benchmark%20score-000?logoColor=FFE165&logo=huggingface&style=for-the-badge" alt="評価ベンチマークスコア"></a>
  <hr>
</div>

OpenHands（旧OpenDevin）へようこそ。これはAIが駆動するソフトウェア開発エージェントのプラットフォームです。

OpenHandsのエージェントは人間の開発者ができることは何でもこなします。コードを修正し、コマンドを実行し、ウェブを閲覧し、APIを呼び出し、StackOverflowからコードスニペットをコピーすることさえできます。

詳細は[docs.all-hands.dev](https://docs.all-hands.dev)をご覧いただくか、[OpenHands Cloud](https://app.all-hands.dev)に登録して始めましょう。

> [!IMPORTANT]
> 仕事でOpenHandsを使っていますか？ぜひお話を聞かせてください。[こちらの短いフォーム](https://docs.google.com/forms/d/e/1FAIpQLSet3VbGaz8z32gW9Wm-Grl4jpt5WgMXPgJ4EDPVmCETCBpJtQ/viewform)にご記入いただき、Design Partnerプログラムにご参加ください。商用機能の早期アクセスや製品ロードマップへのフィードバックの機会を提供します。

![アプリのスクリーンショット](./docs/static/img/screenshot.png)

## ☁️ OpenHands Cloud
OpenHandsを始める最も簡単な方法は[OpenHands Cloud](https://app.all-hands.dev)を利用することです。新規ユーザーには50ドル分の無料クレジットが付与されます。

## 💻 OpenHandsをローカルで実行する

OpenHandsはDockerを利用してローカル環境でも実行できます。システム要件や詳細については[Running OpenHands](https://docs.all-hands.dev/usage/installation)ガイドをご覧ください。

> [!WARNING]
> 公共ネットワークで実行していますか？[Hardened Docker Installation Guide](https://docs.all-hands.dev/usage/runtimes/docker#hardened-docker-installation)を参照して、ネットワークバインディングの制限や追加のセキュリティ対策を実施してください。

```bash
<<<<<<< /Users/yddyf/Documents/code/openhands8/OpenHands-main-3/README_JA.md
docker pull docker.all-hands.dev/all-hands-ai/runtime:0.50-nikolaik
||||||| /tmp/source-analysis/OpenHands-main/README_JA.md
docker pull docker.all-hands.dev/all-hands-ai/runtime:0.55-nikolaik
=======
docker pull docker.all-hands.dev/all-hands-ai/runtime:0.51-nikolaik
>>>>>>> /tmp/colleague-analysis/colleague-code/README_JA.md

docker run -it --rm --pull=always \
<<<<<<< /Users/yddyf/Documents/code/openhands8/OpenHands-main-3/README_JA.md
    -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.50-nikolaik \
||||||| /tmp/source-analysis/OpenHands-main/README_JA.md
    -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.55-nikolaik \
=======
    -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.51-nikolaik \
>>>>>>> /tmp/colleague-analysis/colleague-code/README_JA.md
    -e LOG_ALL_EVENTS=true \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v ~/.openhands:/.openhands \
    -p 3000:3000 \
    --add-host host.docker.internal:host-gateway \
    --name openhands-app \
<<<<<<< /Users/yddyf/Documents/code/openhands8/OpenHands-main-3/README_JA.md
    docker.all-hands.dev/all-hands-ai/openhands:0.50
||||||| /tmp/source-analysis/OpenHands-main/README_JA.md
    docker.all-hands.dev/all-hands-ai/openhands:0.55
=======
    docker.all-hands.dev/all-hands-ai/openhands:0.51
>>>>>>> /tmp/colleague-analysis/colleague-code/README_JA.md
```

**注**: バージョン0.44以前のOpenHandsを使用していた場合は、会話履歴を移行するために `mv ~/.openhands-state ~/.openhands` を実行してください。

OpenHandsは[http://localhost:3000](http://localhost:3000)で起動します！
