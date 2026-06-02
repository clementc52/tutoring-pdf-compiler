FROM node:20

RUN apt-get update && apt-get install -y \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-science

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm","start"]