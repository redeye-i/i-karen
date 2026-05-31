const chalk = require('chalk')
const moment = require('moment')

const theme = {
    time: chalk.hex('#6b4eff'),      
    info: chalk.hex('#b388ff'),
    success: chalk.hex('#4dffb8'),
    warn: chalk.hex('#ffd166'),
    error: chalk.hex('#ff5c5c'),
    debug: chalk.hex('#7df9ff'),

    icon: {
        info: '›',
        success: '✓',
        warn: '⚠',
        error: '✗',
        debug: '•',
        update: '◆',
        cmd: '⌘',
        shard: '⎔',
    }
}

module.exports = class Logger {
    static timestamp() {
        return theme.time(
            moment().utcOffset('+05:30').format('HH:mm:ss')
        )
    }

    static line(icon, color, content) {
        console.log(`${this.timestamp()} ${color(icon)} ${color(content)}`)
    }

    static info(content) {
        this.line(theme.icon.info, theme.info, content)
    }

    static success(content) {
        this.line(theme.icon.success, theme.success, content)
    }

    static warn(content) {
        this.line(theme.icon.warn, theme.warn, content)
    }

    static error(content) {
        this.line(theme.icon.error, theme.error, content)
    }

    static debug(content) {
        this.line(theme.icon.debug, theme.debug, content)
    }
    static update(content) {
        this.line(theme.icon.update, theme.info, content)
    }

    static cmd(content) {
        this.line(theme.icon.cmd, theme.info, content)
    }

    static shard(content) {
        this.line(theme.icon.shard, theme.info, content)
    }

    static log(content) {
        this.info(content)
    }

    static ready(content) {
        this.success(content)
    }
}
