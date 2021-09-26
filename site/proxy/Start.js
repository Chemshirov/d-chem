let path = process.env.TILDA + process.env.AFTER_TILDA
let name = process.env.NAME
let Name = name.charAt(0).toUpperCase() + name.slice(1)
let starter = new (require(path + Name + '.js'))(path)
starter.start() 