const express = require('express')
const path = require("path");
const fs = require('fs')
const jwt = require('jsonwebtoken')
const iconv = require('iconv-lite')
const jschardet = require('jschardet')
const mammoth = require('mammoth')
const config = require('config');

const app = express()
const port = config.get('server.port')

app.set('view engine', 'ejs');
// 静态资源
app.use(express.static(path.join(__dirname, "public")));

// 支持查看的文件类型
const viewedFiles = config.get('server.viewedFiles')
// 声明全局变量
let hostname = null
let dirPath = null
let expTime = null

/**
 * 鉴权拦截
 */
app.use(['/file', '/view', '/download'], function (req, res, next) {
  let referer = req.get('referer')
  if (referer == undefined || referer == null) {
    console.log('referer:', referer)
    next(403)
    return
  }
  if (hostname == null || dirPath == null) {
    console.log('hostname:', hostname, 'dirPath:', dirPath)
    next(403)
    return
  }
  if (referer.indexOf(hostname) == -1) {
    next(403)
    return
  }
  if (expTime == new Date().getTime()) {
    console.log('时间过期了')
    next(403)
    return
  }
  next()
})

/**
 * 首页
 */
app.get('/', (req, res, next) => {
  // 校验来源
  let referer = req.get('referer')
  if (referer == undefined || referer == null || referer.indexOf('pms') == -1) {
    //next(403)
    //return
  }

  console.log('query:', req.query)

  // 解析token
  let token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVG9tIiwiYWdlIjoyMywiaWF0IjoxNTg0MDg4OTYzLCJleHAiOjE1ODQwOTYxNjN9.clcR8LDC7Ncz5INgUJxIJmCJw1RzCwxXL-m_HK6FFIE'

  var decoded = jwt.decode(token);
  console.log(decoded);

  decoded = {
    username: 'hello',
    path: '/Users/tianwei/Downloads',
    deadline: decoded.exp
  }


  let { username, deadline } = decoded

  if (deadline < new Date().getTime()) {
    /*next(403)
    return*/
  }

  hostname = req.hostname
  dirPath = decoded.path
  expTime = deadline

  res.render('index', {
    username,
    fileList: getFileList()
  })
})

/**
 * 获取文件列表
 */
function getFileList(path = '') {
  let fileList = fs.readdirSync(`${dirPath}${path}`)

  fileList = fileList.map(filename => {
    let isFile = fs.statSync(`${dirPath}${path}/${filename}`).isFile()
    return {
      name: filename,
      type: isFile ? filename.replace(/.*(\.[a-z]+)/, '$1') : 'dir',
      path: `${path}/${filename}`
    }
  }).sort((a, b) => {
    // 将文件夹排在文件前面
    if (a.type != 'dir' && b.type == 'dir') {
      return 1
    }
    if (a.type == 'dir' && b.type != 'dir') {
      return -1
    }
    return 0
  })

  return fileList
}

/**
 * 查看文件列表
 */
app.get('/file/*', (req, res, next) => {
  res.render('index', {
    username: 'hello',
    fileList: getFileList(`/${req.params[0]}`)
  })
})

/**
 * 查看文件内容
 */
app.get('/view/*', (req, res, next) => {
  let path = `/${req.params[0]}`
  let filename = path.substring(path.lastIndexOf('/') + 1)
  let postfix = filename.replace(/.*(\.[a-z]+)/, '$1')
  if (postfix == '.docx') {
    mammoth.convertToHtml({ path: `${dirPath}${path}` })
      .then(function (result) {
        var html = result.value;
        //var messages = result.messages;
        res.render('detail', {
          username: 'hello',
          content: html,
          fileType: '.docx'
        })
      })
      .done();
  } else if (viewedFiles.includes(postfix)) {
    let data = fs.readFileSync(`${dirPath}${path}`)
    let detected = jschardet.detect(data)
    let content = iconv.decode(data, detected.encoding)
    res.render('detail', {
      username: 'hello',
      content: content.replace(/\n/g, '<br/>'),
      fileType: postfix
    })
  } else if (filename == postfix) {
    next(415)
  } else {
    res.send(`不支持查看${postfix}类型文件`)
  }
})

/**
 * 下载文件
 */
app.get('/download/*', (req, res) => {
  res.send(fs.readFileSync(`${dirPath}/${req.params[0]}`))
})

/**
 * 其它路由匹配
 */
app.use(function (req, res, next) {
  res.render('error', {
    message: '404'
  })
})

/**
 * 错误响应
 */
app.use(function (err, req, res, next) {
  let message = err
  switch (err) {
    case 403:
      message = '拒绝访问'
      break;
    case 404:
      message = '你访问的页面不存在'
      break;
    default:
      break;
  }
  res.render('error', {
    message
  })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
