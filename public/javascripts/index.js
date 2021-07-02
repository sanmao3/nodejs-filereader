const postfixList = [".txt", ".log", ".docx", ".html", ".js", ".css", ".md"]

function viewFile(el) {
  let path = el.getAttribute('data-path')
  let filename = el.getAttribute('data-filename')
  let postfix = filename.replace(/.*(\.[a-z]+)/, '$1')
  if (postfixList.includes(postfix)) {
    window.location = `/view${path}`
  } else {
    alert(`不支持查看${postfix}类型文件`)
  }
}
