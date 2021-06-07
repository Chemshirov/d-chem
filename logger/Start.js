let path = process.env.TILDA + process.env.AFTER_TILDA + '/'
let name = process.env.NAME
let Name = name.charAt(0).toUpperCase() + name.slice(1)
new (require(path + Name + '.js'))(path)