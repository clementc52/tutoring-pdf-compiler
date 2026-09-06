FROM node:22-trixie-slim

ARG TARGETARCH=amd64

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    chktex \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-science \
    && tectonic_arch="$TARGETARCH" \
    && if [ "$tectonic_arch" = "amd64" ]; then tectonic_arch="x86_64"; elif [ "$tectonic_arch" = "arm64" ]; then tectonic_arch="aarch64"; else echo "Unsupported target architecture: $tectonic_arch" && exit 1; fi \
    && curl -fsSL -o /tmp/tectonic.tar.gz "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic@0.17.0/tectonic-0.17.0-${tectonic_arch}-unknown-linux-gnu.tar.gz" \
    && tar -xzf /tmp/tectonic.tar.gz -C /usr/local/bin \
    && chmod +x /usr/local/bin/tectonic \
    && rm -f /tmp/tectonic.tar.gz \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

CMD ["npm","start"]
