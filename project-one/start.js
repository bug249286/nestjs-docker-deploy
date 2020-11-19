#! /usr/bin/env node
const { program } = require('commander')
const Local = require('./local')
const Remote = require('./remote')
program.version('1.0.0')
program
  .command('init')
  .description('init application config')
  .action(async function () {
    await Local.init()
  })
program
  .command('start')
  .description('start deploy your App to the server(s)')
  .option('-c, --config [type]', 'Config File')
  .action(async function () {
    const config =
      this.config !== undefined && this.config !== true
        ? this.config
        : 'config.json'

    await Local.build();

    const config_json = Remote.config(config)
    const ssh = await Remote.connect(config_json)
    const result_check = await Remote.checkHost(ssh)
    if (!result_check) {
      ssh.dispose()
      return false
    }
    const result_init = await Remote.initHost(config_json, ssh)
    if (result_init === false) {
      ssh.dispose()
      return false
    }

    const result_uptoserver = await Remote.upToServer(config_json, ssh)
    if (result_uptoserver === false) {
      ssh.dispose()
      return false
    }

    const result_upzip = await Remote.upzip(config_json, ssh)
    if (result_upzip === false) {
      ssh.dispose()
      return false
    }

    const result_backup = await Remote.backup(config_json, ssh)
    if (result_backup === false) {
      ssh.dispose()
      return false
    }

    const result_unzip = await Remote.buildImage(config_json, ssh)
    if (result_unzip === false) {
      ssh.dispose()
      return false
    }

    const result_runApp = await Remote.runApp(config_json, ssh)
    if (result_runApp === false) {
      ssh.dispose()
      return false
    }
    /*
    const result_clean_image = await Remote.clean(config_json, ssh)
    if (result_clean_image === false) {
      ssh.dispose()
      return false
    }
    */

    const result_removeFile = await Remote.deleteFiles(config_json, ssh)
    if (result_removeFile === false) {
      ssh.dispose()
      return false
    }
    await Local.remove();

    console.log('------- ... LOADING ... -------')
    await Local.waiting(5000)
    const result = await Remote.isSuccess(config_json, ssh)
    if (result === true) {
      console.log('------- DEPLOY STATUS SUCCESS -------')

      const result_bktopre = await Remote.backupToPrevious(config_json, ssh)
      if (result_bktopre === false) {
        ssh.dispose()
        return false
      }

      const result_clean_image = await Remote.clean(config_json, ssh)
      if (result_clean_image === false) {
        ssh.dispose()
        return false
      }

    } else {
      console.log('------- DEPLOY STATUS FAIL -------')
      const result_rollback = await Remote.rollback(config_json, ssh)
      if (result_rollback === false) {
        ssh.dispose()
        return false
      }

      const result_runAppRollback = await Remote.runApp(config_json, ssh)
      if (result_runAppRollback === false) {
        ssh.dispose()
        return false
      }

      console.log('------- ... LOADING ... -------')
      await Local.waiting(5000)
      const resultRollback = await Remote.isSuccess(config_json, ssh)
      if (resultRollback === true) {
        console.log('------- ROLLBACK STATUS SUCCESS -------')
      } else {
        console.log('------- ROLLBACK STATUS FAIL -------')
      }
    }
    ssh.dispose()
  })

program
  .command('stop')
  .option('-c, --config [type]', 'Config File')
  .description('init application config')
  .action(async function () {
    const config =
      this.config !== undefined && this.config !== true
        ? this.config
        : 'config.json'
    const config_json = Remote.config(config)
    const ssh = await Remote.connect(config_json)
    await Remote.stop(config_json, ssh)
    console.log('------- STOP SUCCESS -------')
    ssh.dispose()
  })

  program
  .command('clean')
  .option('-c, --config [type]', 'Config File')
  .description('init application config')
  .action(async function () {
    const config =
      this.config !== undefined && this.config !== true
        ? this.config
        : 'config.json'
    const config_json = Remote.config(config)
    const ssh = await Remote.connect(config_json)
    await Remote.clean(config_json, ssh)
    console.log('------- CLEAN SUCCESS -------')
    ssh.dispose()
  })

program
  .command('delete')
  .option('-c, --config [type]', 'Config File')
  .description('init application config')
  .action(async function () {
    const config =
      this.config !== undefined && this.config !== true
        ? this.config
        : 'config.json'
    const config_json = Remote.config(config)
    const ssh = await Remote.connect(config_json)
    await Remote.delete(config_json, ssh)
    console.log('------- DELETE SUCCESS -------')
    ssh.dispose()
  })

program.parse(process.argv)
