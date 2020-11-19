const nodessh = require("node-ssh");
const path = require("path");

module.exports = {
  config: (deployJsonName = "config.json") => {
    let cwd_process = process.cwd();
    return require(path.resolve(cwd_process, deployJsonName));
  },
  connect: async (_config) => {
    console.log("Start Connect to server");
    console.log("");
    let session_ssh = new nodessh();
    let config = {
      host: _config.server.host,
      username: _config.server.username,
      tryKeyboard: true,
    };
    if (_config.server.password) {
      config.password = _config.server.password;
    }
    if (_config.server.pem) {
      config.privateKey = _config.server.pem;
    }
    try {
      await session_ssh.connect(config);
      return session_ssh;
    } catch (err) {
      console.log("Connect to Server Error ", err);
    }
  },
  runCommand: async (cmd, ssh, method) => {
    try {
      let result = await ssh.execCommand(cmd, {});
      if (result.stderr) {
        if (/.*error.*/.test(result.stderr)) {
          console.log(`${method}\r\n`, result.stderr);
          return false;
        }
      }
      console.log('Result Run : '+method, result.stdout);
      return result.stdout;
    } catch (error) {
      console.log(error);
      return false;
    }
  },
  checkHost: async function (ssh) {
    let cmd = `(command -v git || echo 'missing git' 1>&2) && (command -v docker || echo 'missing docker' 1>&2)`;
    console.log("Start check server");
    console.log("");
    let result = await this.runCommand(cmd, ssh, "Start check server");
    if (/.*missing.*/.test(result)) {
      console.log("Error", result);
      return false;
    } else {
      console.log("Success", result);
      return true;
    }
  },
  initHost: async function (_config, ssh) {
    console.log("Start check source application");
    console.log("");
    await this.runCommand(
      `cd ${_config.server.deploymentDir} && mkdir ${_config.appName}`,
      ssh,
      "Start create Folder application"
    );

    let cmd = `cd ${_config.server.deploymentDir}  && [ -d "${_config.appName}" ] && echo "yes" || echo "noop"`;
    let result = await this.runCommand(
      cmd,
      ssh,
      "Start check source application"
    );
    if (/.*noop.*/.test(result)) {
      console.log("App not exists");
      return false;
    } else {
      return true;
      //return this.pull(_config, ssh)
    }
  },
  upToServer: async function (_config, ssh) {
    console.log("Start upload Dockerfile && .env");
    console.log("");
    try {
      let cwd_process = process.cwd();
      await ssh.putFile(
        `${cwd_process}/Dockerfile`,
        `${_config.server.deploymentDir}/${_config.appName}/Dockerfile`
      );
      await ssh.putFile(
        `${cwd_process}/dist.tar.gz`,
        `${_config.server.deploymentDir}/${_config.appName}/dist.tar.gz`
      );
      await ssh.putFile(
        `${cwd_process}/package.json`,
        `${_config.server.deploymentDir}/${_config.appName}/test/package.json`
      );
      await ssh.putFile(
        `${cwd_process}/package-lock.json`,
        `${_config.server.deploymentDir}/${_config.appName}/test/package-lock.json`
      );
      await ssh.putFile(
        `${cwd_process}/.env`,
        `${_config.server.deploymentDir}/${_config.appName}/.env`
      );
      console.log("Upload Dockerfile && .env Success");
    } catch (err) {
      console.log("Upload Dockerfile && .env Fail");
      console.log(err);
      return false;
    }
    return true;
  },
  pull: async function (_config, ssh) {
    console.log("Start git pull");
    console.log("");
    let cmd = `cd ${_config.server.deploymentDir}/${_config.appName}  && git pull origin ${_config.branch}`;
    return await this.runCommand(cmd, ssh, "Start git pull");
  },
  buildImage: async function (_config, ssh) {
    console.log("Start Build Image");
    console.log("");
    let cmd = `cd ${_config.server.deploymentDir}/${_config.appName} && ${_config.server.sudo} docker build  -t ${_config.appName} .`;
    return await this.runCommand(cmd, ssh, "Start Build Image");
  },
  runApp: async function (_config, ssh) {
    console.log("Start Run Container");
    console.log("");
    let cmd = `${_config.server.sudo} docker rm -f ${_config.appName} || echo 'not' 1>&2 && ${_config.server.sudo} docker run --name ${_config.appName} -d ${_config.volume} -p 127.0.0.1:${_config.port}:9999 ${_config.appName}:latest`;
    return await this.runCommand(cmd, ssh, "Start Run Container");
  },
  clean: async function (_config, ssh) {
    console.log("Start Clean!!");
    console.log(""); //docker image prune --filter="dangling=true"
    let cmd = `${_config.server.sudo} docker image prune --filter="dangling=true" -f`;
    return await this.runCommand(cmd, ssh, "Start Clean!!");
  },
  isSuccess: async function (_config, ssh) {
    if (_config.textVerify) {
      let cmd = `curl 127.0.0.1:${_config.port}`;
      if (_config.pathVerify) cmd = `${cmd}${_config.pathVerify}`;
      let result = await this.runCommand(cmd, ssh, "check");
      if (new RegExp(_config.textVerify, "g").test(result)) {
        return true;
      } else {
        return false;
      }
    } else {
      return true;
    }
  },
  stop: async function (_config, ssh) {
    let cmd = `${_config.server.sudo} docker stop ${_config.appName}`;
    return await this.runCommand(cmd, ssh, "stop");
  },
  start: async function (_config, ssh) {
    let cmd = `${_config.server.sudo} docker start ${_config.appName}`;
    return await this.runCommand(cmd, ssh, "stop");
  },
  delete: async function (_config, ssh) {
    let cmd = `${_config.server.sudo} docker rm -f ${_config.appName}`;
    return await this.runCommand(cmd, ssh, "delete");
  },

  deleteFiles: async function (_config, ssh) {
    console.log("Start Delete File");
    let cmd = `rm -rf ${_config.server.deploymentDir}/${_config.appName}/dist && rm -rf ${_config.server.deploymentDir}/${_config.appName}/test/package.json && rm -rf ${_config.server.deploymentDir}/${_config.appName}/test/package-lock.json && rm ${_config.server.deploymentDir}/${_config.appName}/dist.tar.gz`;
    return await this.runCommand(cmd, ssh, "deleteFiles");
  },

  upzip: async function (_config, ssh) {
    console.log("Start unzip");
    console.log("");
    let cmd = `cd ${_config.server.deploymentDir}/${_config.appName}  && rm -rf dist && tar -xf dist.tar.gz`;
    return await this.runCommand(cmd, ssh, "upzip");
  },

  backup: async function (_config, ssh) {
    console.log("Start create previous image");
    console.log("");
    let cmd = `${_config.server.sudo} docker tag ${_config.appName}:latest ${_config.appName}:backup || echo 'not' 1>&2`;
    return await this.runCommand(cmd, ssh, "Start create previous image");
  },

  backupToPrevious: async function (_config, ssh) {
    console.log("Start create Backup to Previous image");
    console.log("");
    let cmd = `${_config.server.sudo} docker tag ${_config.appName}:backup ${_config.appName}:previous || echo 'not' 1>&2 && ${_config.server.sudo} docker rmi -f ${_config.appName}:backup || echo 'not' 1>&2`;
    return await this.runCommand(
      cmd,
      ssh,
      "Start create Backup to Previous image"
    );
  },

  rollback: async function (_config, ssh) {
    console.log("Start Rollback Container");
    console.log("");
    let cmd = `${_config.server.sudo} docker tag ${_config.appName}:previous ${_config.appName}:latest || echo 'not' 1>&2`;
    return await this.runCommand(
      cmd,
      ssh,
      "Start create previous to latest image"
    );
  },
};
