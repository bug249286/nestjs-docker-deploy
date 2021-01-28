const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const abs = require("abs");
const rimraf = require("rimraf");
module.exports = {
  removeFolder: (f) =>
    new Promise((resolve, reject) => {
      rimraf(f, function () {
        resolve(true);
      });
    }),
  runCommand: (cmd) =>
    new Promise((resolve, reject) => {
      exec(
        cmd,
        {
          maxBuffer: 1024 * 200000,
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
          }
          console.log(stdout);
          resolve(stdout ? stdout : stderr);
        }
      );
    }),
  waiting: (time) =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(true);
      }, time);
    }),
  init: async function () {
    console.log('init nest run');
    let default_json = require("./config.json");
    try {
      let prettyJson = JSON.stringify(default_json, null, 2);
      fs.writeFileSync("config.json", prettyJson);
      fs.writeFileSync(
        "Dockerfile",
        `FROM ${prettyJson.nodeVersion}-alpine as production
ENV NODE_ENV production
WORKDIR /usr/src/app
RUN apk update && apk upgrade
COPY .env .
COPY test/package.json .
COPY test/package-lock.json .
COPY dist ./dist
RUN npm install --only=production
EXPOSE 9999
CMD ["node", "dist/main"]   
`
      );
      fs.writeFileSync(
        ".env",
        `TZ=Asia/Bangkok`
      );
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  },

  build: async function (deployJsonName = "config.json") {
    console.log("start building...");
    let cwd_process = process.cwd();
    let config = require(path.resolve(cwd_process, deployJsonName));
    try {

      fs.writeFileSync(
        "../Dockerfile",
        `FROM ${config.nodeVersion} As development
  WORKDIR /usr/src/app
  COPY package.json .
  RUN npm install
  COPY . .
  RUN npm run build`);


      let command1 = `cd .. && docker build -t ${config.appName}:build .`;
      await this.runCommand(command1);
      console.log("building SUCCESS");

      let command2 = `id=$(docker create ${config.appName}:build) && docker cp $id:/usr/src/app/dist - > dist.tar.gz && docker rm -f $id `;
      await this.runCommand(command2);
      console.log("copy dist  SUCCESS");

      let command3 = `id=$(docker create ${config.appName}:build) && docker cp $id:/usr/src/app/package.json - > package.tar.gz && docker rm -f $id && tar -xf package.tar.gz `;
      await this.runCommand(command3);
      console.log("copy package SUCCESS");

      let command4 = `id=$(docker create ${config.appName}:build) && docker cp $id:/usr/src/app/package-lock.json - > package-lock.tar.gz && docker rm -f $id && tar -xf package-lock.tar.gz `;
      await this.runCommand(command4);
      console.log("copy package-lock SUCCESS");

      let command6 = `docker rmi -f ${config.appName}:build`;
      await this.runCommand(command6);
      console.log("remove docker build");
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  },
  remove: async function () {
    let cwd_process = process.cwd();
    if (fs.existsSync(`${cwd_process}/package.tar.gz`)) {
      await this.removeFolder(`${cwd_process}/package.tar.gz`);
    }
    if (fs.existsSync(`${cwd_process}/package.json`)) {
      await this.removeFolder(`${cwd_process}/package.json`);
    }
    if (fs.existsSync(`${cwd_process}/package-lock.tar.gz`)) {
      await this.removeFolder(`${cwd_process}/package-lock.tar.gz`);
    }
    if (fs.existsSync(`${cwd_process}/package-lock.json`)) {
      await this.removeFolder(`${cwd_process}/package-lock.json`);
    }
    if (fs.existsSync(`${cwd_process}/dist.tar.gz`)) {
      await this.removeFolder(`${cwd_process}/dist.tar.gz`);
    }
    let command5 = `docker rmi $(docker images --filter "dangling=true" -q --no-trunc) || echo "OK"`;
    await this.runCommand(command5);
    console.log("clear docker images SUCCESS");
  },
};
