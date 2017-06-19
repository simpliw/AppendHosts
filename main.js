const {app, Menu, Tray,nativeImage} = require('electron')
const path = require('path')
const fs = require('fs')
const request = require('request')
const notifier = require('node-notifier');
const os = require('os').platform()
var sudo = require('sudo-prompt');
let tray = null
const hostsUrl = 'https://raw.githubusercontent.com/racaljk/hosts/master/hosts'
const hostsPaths = {
  mac: '/etc/hosts',
  windows: 'C:/Windows/System32/drivers/etc/hosts'
}
const options = {
  name: 'AppendHosts',
  icns: path.join(__dirname,'images/dock.png')
}
let hostsPath;
if(os === 'darwin') {
  hostsPath = hostsPaths.mac
} else {
  hostsPath = hostsPaths.windows
}
let flag = '#---this-is-a-line---\n'

let operating = false
app.dock.setIcon(nativeImage.createFromPath(path.join(__dirname,'images/dock.png')))

const shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {})

if (shouldQuit) {
  app.quit();
}

app.on('ready', () => {
  tray = new Tray(path.join(__dirname,'images/tray.png'))
  const contextMenu = Menu.buildFromTemplate([
    {label: 'hosts更新', type: 'normal',click: function() {
      if( operating ) return
      operating = true
      fetchHosts(hostsUrl)
    }},
    {label: 'hosts还原', type: 'normal',click: function() {
      if( operating ) return
      operating = true
      resetHosts(hostsPath)
    }},
    {label: '退出', type: 'normal',click: function(){
      app.quit()
    }}
  ])
  tray.setContextMenu(contextMenu)
})

function fetchHosts(hostsUrl) {
  tray.setTitle('拉取中...')
  request(hostsUrl, function (error, response, body) {
    tray.setTitle('更取中...')
    appendHosts(hostsPath,body) 
  })
}

function appendHosts(file, data, fn) {
  fs.readFile(file, (err, d) => {
    if (err) {
      notifMsg(err.code)
      return
    }
    let flagIndex = d.indexOf(flag)
    if (flagIndex !== -1) {
      let content = d.slice(0, flagIndex) + flag + data
      createTempHostsAndMv(content, file)
    } else {
      let content = d + flag + data
      createTempHostsAndMv(content, file)
    }
  })
}
function notifMsg(msg) {
  tray.setTitle('')
  operating = false
  notifier.notify({
    title: "AppendHosts",
    message: msg,
  })
}
function resetHosts(file) {
  tray.setTitle('还原中...')
  fs.readFile(file, (err, d) => {
    if (err) {
      notifMsg(err.code)
      return
    }
    let flagIndex = d.indexOf(flag)
    if( flagIndex!== -1 ) {
      let content = d.slice(0, flagIndex).toString()
      createTempHostsAndMv(content, file)
    } else {
      notifMsg('hosts reset sucess')
    }
  })
}

function createTempHostsAndMv(data,file) {
  let sourcePath = path.join(__dirname,'hosts')
  fs.writeFile(sourcePath, data, (err) => {
    if (err) {
      notifMsg(err)
      return
    }
    sudo.exec(`mv ${sourcePath} ${file}`, options, function (error, stdout, stderr) {
      if (error) {
        tray.setTitle('')
        return
      }
      notifMsg('hosts reset sucess')
    });
  });
}