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
    let default_json = require("./config.json");
    console.log('run - init');
    try {
      let prettyJson = JSON.stringify(default_json, null, 2);
      fs.writeFileSync("config.json", prettyJson);
      fs.writeFileSync(
        "DockerfileProduction",
        `FROM ${prettyJson.nodeVersion}-alpine as production
ENV NODE_ENV production
WORKDIR /usr/src/app
RUN apk update && apk upgrade
COPY .env .
COPY tmp/package.json .
COPY tmp/package-lock.json .
COPY tmp/main.js .
COPY tmp/i18n ./i18n
RUN npm install --only=production
EXPOSE 9999
CMD ["node", "main"]   
`);
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

    fs.writeFileSync(
      "../../Dockerfile",
      `FROM ${config.nodeVersion} As development
WORKDIR /usr/src/app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build ${config.appBuild}`);
    try {

      if(typeof config.i18n==='boolean' && config.i18n){
        let current_path = await this.runCommand('pwd');
        let commandi18n = `cd ../../apps/${config.appBuild}/src/ && tar -zcvf ${current_path.trim()}/i18n.tar.gz i18n`;
        await this.runCommand(commandi18n);
        console.log("commandi18n SUCCESS");
      }

      let command1 = `cd ../../ && docker build -t ${config.appName}:build .`;
      await this.runCommand(command1);
      console.log("building SUCCESS");

      let command2 = `id=$(docker create ${config.appName}:build) && docker cp $id:/usr/src/app/dist/apps/${config.appBuild}/main.js - > main.tar.gz && docker rm -f $id && tar -xf main.tar.gz `;
      await this.runCommand(command2);
      console.log("copy main.js  SUCCESS");

      let command3 = `id=$(docker create ${config.appName}:build) && docker cp $id:/usr/src/app/package.json - > package.tar.gz && docker rm -f $id && tar -xf package.tar.gz `;
      await this.runCommand(command3);
      console.log("copy package.json SUCCESS");

      let command4 = `id=$(docker create ${config.appName}:build) && docker cp $id:/usr/src/app/package-lock.json - > package-lock.tar.gz && docker rm -f $id && tar -xf package-lock.tar.gz `;
      await this.runCommand(command4);
      console.log("copy package-lock.json SUCCESS");

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
    if (fs.existsSync(`${cwd_process}/main.tar.gz`)) {
      await this.removeFolder(`${cwd_process}/main.tar.gz`);
    }
    if (fs.existsSync(`${cwd_process}/main.js`)) {
      await this.removeFolder(`${cwd_process}/main.js`);
    }
    if (fs.existsSync(`${cwd_process}/../../Dockerfile`)) {
      await this.removeFolder(`${cwd_process}/../../Dockerfile`);
    }
    if (fs.existsSync(`${cwd_process}/i18n.tar.gz`)) {
      await this.removeFolder(`${cwd_process}/i18n.tar.gz`);
    }
    let command5 = `docker rmi $(docker images --filter "dangling=true" -q --no-trunc) || echo "OK"`;
    await this.runCommand(command5);
    console.log("clear docker images SUCCESS");
  },
};
