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
        "Dockerfile",
        `FROM ${config.nodeVersion}-alpine as production
ENV NODE_ENV production
WORKDIR /usr/src/app
RUN apk update && apk upgrade
COPY .env .
COPY ./app .
RUN npm install --only=production
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]   
`
);
      fs.writeFileSync(
        "../Dockerfile",
        `FROM ${config.nodeVersion}-alpine as production
ENV NODE_ENV production
WORKDIR /usr/src/app
COPY . .
EXPOSE 3000
CMD ["npm", "start"]   
`
);
      let command1 = `cd .. && docker build -t ${config.appName}:latest .`;
      await this.runCommand(command1);
      console.log("building SUCCESS");

      let command2 = `id=$(docker create ${config.appName}:latest) && docker cp $id:/usr/src/app - > app.tar.gz && docker rm -f $id`;
      await this.runCommand(command2);
      console.log("copy app.tar.gz  SUCCESS");
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  },
  remove: async function (config) {
    let cwd_process = process.cwd();
    if (fs.existsSync(`${cwd_process}/app.tar.gz`)) {
      await this.removeFolder(`${cwd_process}/app.tar.gz`);
    }
    let command5 = `docker rmi $(docker images --filter "dangling=true" -q --no-trunc) || echo "OK"`;
    await this.runCommand(command5);
    console.log("clear docker images SUCCESS");
  },
};
