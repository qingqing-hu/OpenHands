ARG OPENHANDS_BUILD_VERSION=dev
FROM node:24.3.0-bookworm-slim AS frontend-builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
# RUN npm ci

COPY frontend ./

# RUN npm run build

FROM python:3.12.10-slim AS backend-builder

WORKDIR /app
ENV PYTHONPATH='/app'

# 使用内网pip源安装依赖
COPY pyproject.toml poetry.lock ./
COPY requirements.txt ./

# 使用内网pip源直接安装
RUN python3 -m pip install --no-cache-dir -r requirements.txt --index-url http://mirrors.myhexin.com/repository/pypi-public/simple/ --trusted-host mirrors.myhexin.com --timeout 180 --default-timeout 180 --retries 20

FROM python:3.12.10-slim AS openhands-app


WORKDIR /app

# re-declare for this section
ARG OPENHANDS_BUILD_VERSION

ENV RUN_AS_OPENHANDS=true
# A random number--we need this to be different from the user's UID on the host machine
ENV OPENHANDS_USER_ID=42420
ENV SANDBOX_LOCAL_RUNTIME_URL=http://host.docker.internal
ENV USE_HOST_NETWORK=false
ENV WORKSPACE_BASE=/opt/workspace_base
ENV OPENHANDS_BUILD_VERSION=$OPENHANDS_BUILD_VERSION
ENV SANDBOX_USER_ID=0
ENV FILE_STORE=local
ENV FILE_STORE_PATH=/.openhands
ENV INIT_GIT_IN_EMPTY_WORKSPACE=1
RUN mkdir -p $FILE_STORE_PATH
RUN mkdir -p $WORKSPACE_BASE

COPY containers/app/offline-packages/*.deb /tmp/debs/
RUN cd /tmp/debs && \
    dpkg -i --force-all *.deb || apt-get install -f -y --no-install-recommends

RUN groupadd app
RUN useradd -l -m -u $OPENHANDS_USER_ID -s /bin/bash openhands && \
    usermod -aG app openhands && \
    usermod -aG sudo openhands && \
    echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers
RUN chown -R openhands:app /app && chmod -R 770 /app
RUN sudo chown -R openhands:app $WORKSPACE_BASE && sudo chmod -R 770 $WORKSPACE_BASE
USER openhands

ENV VIRTUAL_ENV=/app/.venv \
    PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH='/app'

# 复制已安装的包
COPY --from=backend-builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=backend-builder /usr/local/bin /usr/local/bin

COPY --chown=openhands:app --chmod=770 ./microagents ./microagents
COPY --chown=openhands:app --chmod=770 ./openhands ./openhands
COPY --chown=openhands:app --chmod=777 ./openhands/runtime/plugins ./openhands/runtime/plugins
COPY --chown=openhands:app pyproject.toml poetry.lock README.md MANIFEST.in LICENSE ./

USER root
RUN python openhands/core/download.py && find /app \! -group app -exec chgrp app {} +
USER openhands

COPY --chown=openhands:app --chmod=770 --from=frontend-builder /app/build ./frontend/build
COPY --chown=openhands:app --chmod=770 ./containers/app/entrypoint.sh /app/entrypoint.sh

USER root

WORKDIR /app

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "openhands.server.listen:app", "--host", "0.0.0.0", "--port", "5000"]
