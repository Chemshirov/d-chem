class V5 {
	constructor(o) {
		this.o = o
	}
	
	getInsertSQL(object) {
		this.insertSQL = this._getInsertSQL(object)
	}
	
	insert(object) {
		return new Promise(success => {
			let selectAll = this._getSelectAll()
			let selectAllA = this._getSelectAll('a')
			let firstVoidSQL = this._getFirstVoidSQL(selectAll, selectAllA)
			this.o.Sql.commit(firstVoidSQL).then(data => {
				success()
			})
		})
	}
	
	selectTable() {
		return new Promise(success => {
			this.typeArray = []
			let selectTableSql = this._getSelectTableSql()
			this.o.Sql.commit(selectTableSql).then(array => {
				if (array) {
					array.forEach(object => {
						this.typeArray.push(object['type'])
					})
				}
				success()
			})
		})
	}
	
	handleTypes(name) {
		this.name = name
		return new Promise(async success => {
			for (let i = 0; i < this.typeArray.length; i++) {
				let type = this.typeArray[i]
				if (type == 'hidden') {
					await this._handleTypeHidden()
				} else if (type == 'passives') {
					await this._handleTypePassivesAndLookout(type)
				} else if (type == 'lookout') {
					await this._handleTypePassivesAndLookout(type)
				} else if (type == 'balances') {
					await this._handleTypeBalances()
				} else if (type == 'rates') {
					await this._handleTypeRates()
				} else if (type == 'spendDates') {
					await this._handleTypeSpendDates()
				} else if (type == 'verification') {
					await this._handleTypeVerification()
				} else if (type == 'in') {
					await this._handleTypeIn()
				} else if (type == 'delete') {
					await this._handleTypeDelete()
				} else if (type == 'expenseChange') {
					await this._handleTypeExpenseChange()
				}
			}
			success()
		})
	}
	
	illUser() {
		return new Promise(async success => {
			if (Math.random() <= 0.15) {
				await this._getIllUser()
				if (this.illUser) {
					await this._getIllUserType()
					await this._handleIllUserTypes()
					await this._handleIllUserBalances()
					await this._handleIllUserLogins()
					success()
				}
			} else {
				success()
			}
		})
	}
	
	getMD5(name) {
		if (name) {
			this.name = name
		}
		return new Promise(async success => {
			let md5 = ''
			this.oldMd5 = ''
			let md5ListSql = this._getMd5ListSql()
			await this.o.Sql.commit(this._setMd5ListCacheTable())
			if (Math.random() < 1 / 50) {
				await this.o.Sql.commit(this._setMd5ListCache())
			}
			this.o.Sql.commit(md5ListSql).then(async array => {
				if (array) {
					array.forEach(object => {
						if (!this.oldMd5) {
							this.oldMd5 = object['md5']
						}
						md5 += object['a']
					})
					this.md5 = this.o.crypto.createHash('md5').update(md5).digest('hex')
					if (this.md5 && this.oldMd5 && this.oldMd5 != this.md5) {
						await this._updateMd5()
					}
					if (this.md5 && !this.oldMd5) {
						await this._insertMd5()
					}
					await this._getMd52()
					success('ok')
				}
			})
		})
	}
	
	_getMd52() {
		return new Promise(async success => {
			await this.o.Sql.commit(this._setMd52ListCacheTable())
			if (Math.random() < 1 / 50) {
				await this.o.Sql.commit(this._setMd52ListCache())
			}
			this.o.Sql.commit(this._getMd52sql()).then(async array => {
				if (array) {
					this.m52count = array.length
					let md5 = ''
					let shortUsersCount = 0
					array.forEach(object => {
						if (!this.oldMd52) {
							this.oldMd52 = object['old']
						}
						md5 += object['md5']
						if (object['t']) {
							shortUsersCount++
						}
					})
					this.shortUsersCount = shortUsersCount
					this.md52 = this.o.crypto.createHash('md5').update(md5).digest('hex')
					if (this.md52 && this.oldMd52 && this.oldMd52 != this.md52) {
						await this._deleteMd52()
					}
					if (this.md52) {
						await this._updateMd52()
					}
					this.o.start.getMD5().then(ok => {
						success()
					})
				}
			})
		})
	}
	
	_setMd52ListCacheTable() {
		let sql = `
			CREATE TABLE if NOT exists finance5md52 (
				t VARCHAR(32) NULL DEFAULT NULL,
				d CHAR(19) NOT NULL DEFAULT '',
				md5 VARCHAR(32) NULL DEFAULT NULL,
				PRIMARY KEY (md5)
			)
			COLLATE='utf8_general_ci'
			ENGINE=InnoDB;
		`
		return sql
	}
	
	_setMd52ListCache() {
		let sql = `
			truncate finance5md52;
			insert into finance5md52 (t, d, md5)
			${this._getMd52ListSql()}
			on duplicate key update t = values(t), d = values(d);
		`
		return sql
	}
	
	_getMd52ListSql() {
		let lis = this._getMd5Lis()
		let sql = `
			select if(left(types, 6) = 'in' and userName = "${this.name}", 1, null)t,
				a.date, md5(concat(${lis}))md5
			from finance5 a
			where length(a.date) = 19
				and (left(types, 6) = "in" or left(types, 6) = "delete")
				and (companyF = "${this.name}" or companyT = "${this.name}")
		`
		return sql
	}
	
	_getMd52sql() {
		let lis = this._getMd5Lis()
		let sql = `
			select a.md5, a.t, b.old
				from
					(
						${this._getMd52ListSql()} and a.date > now() - interval 1 year
						
						union
						
						select a.t, a.d, a.md5 a
						from finance5md52 a
						where length(a.d) = 19 and  a.d <= now() - interval 1 year
					) a
				left join 
					(
						select \`from\` old
						from finance5 
						where types = 'md5-2' and companyF = '${this.name}' limit 1
					) b
				on 1
				order by a.md5
		`
		return sql
	}
	
	_updateMd52() {
		return new Promise(success => {
			let sql = `
				insert 
				into finance5 (types, companyF, \`from\`, \`date\`, \`comment\`, userID)
				select 'md5-2', '${this.name}', '${this.md52}', now(), '${this.m52count}', '${this.shortUsersCount}'
				on duplicate key update \`date\` = values(\`date\`),
					\`comment\` = values(\`comment\`), \`userID\` = values(\`userID\`)
			`
			this.o.Sql.commit(sql).then(ok => {
				success()
			})
		})
	}
	
	_deleteMd52() {
		return new Promise(success => {
			let sql = `
				delete 
				from finance5 
				where types = 'md5-2' and companyF = '${this.name}'
			`
			this.o.Sql.commit(sql).then(ok => {
				success()
			})
		})
	}
	
	_insertMd5() {
		return new Promise(success => {
			let sql = `
				insert into finance5 (types, companyF, \`from\`, \`date\`)
				select 'md5', '${this.name}', '${this.md5}', now()
				on duplicate key update \`date\` = values(\`date\`)
			`
			this.o.Sql.commit(sql).then(ok => {
				success()
			})
		})
	}
	
	_updateMd5() {
		return new Promise(success => {
			let sql = `
				update finance5 
				set \`from\` = '${this.md5}', \`date\` = now()
				where types = 'md5' and companyF = '${this.name}'
			`
			this.o.Sql.commit(sql).then(ok => {
				success()
			})
		})
	}
	
	_getMd5ListSql() {
		let lis = this._getMd5Lis()
		let superWhere = this._getSuperWhere()
		let sql = `
			select a.a, b.md5
			from
				(
					(select md5(concat(${lis}))a
					from finance5 a
					where length(a.\`date\`) = 19 and a.\`date\` > now() - interval 1 year and (${superWhere})
					order by ${lis})
					union
					(select a.md5 a
					from finance5md5 a
					where length(a.d) = 19 and  a.d <= now() - interval 1 year
					order by a.str)
				) a
			left join
				(
					select \`from\` md5 
					from finance5 
					where types = 'md5' and companyF = '${this.name}'
					limit 1
				) b
			on 1
		`
		return sql
	}
	
	_setMd5ListCacheTable() {
		let sql = `
			CREATE TABLE if NOT exists finance5md5 (
				str LONGTEXT NOT NULL DEFAULT '',
				d CHAR(19) NOT NULL DEFAULT '',
				md5 VARCHAR(32) NULL DEFAULT NULL,
				PRIMARY KEY (md5)
			)
			COLLATE='utf8_general_ci'
			ENGINE=InnoDB;
		`
		return sql
	}
	
	_setMd5ListCache() {
		let lis = this._getMd5Lis()
		let superWhere = this._getSuperWhere()
		let sql = `
			truncate finance5md5;
			insert into finance5md5 (str, d, md5)
			select a.str, a.date, md5(a.str)m
			from
				(
					select concat(${lis})str, a.date
					from finance5 a
					where ${superWhere}
					order by ${lis}
				) a
			where length(a.date) = 19
			on duplicate key update d = values(d);
		`
		return sql
	}
	
	_getMd5Lis() {
		return `
			lower(ifnull(substr(types, 1, 32), '')),
			lower(ifnull(substr(companyF, 1, 255), '')),
			lower(ifnull(substr(\`from\`, 1, 255), '')),
			lower(ifnull(substr(\`date\`, 1, 32), '')),
			lower(ifnull(substr(companyT, 1, 255), '')),
			lower(ifnull(substr(\`to\`, 1, 255), '')),
			lower(ifnull(substr(\`inputType\`, 1, 32), '')),
			lower(ifnull(substr(amount, 1, 32), '')),
			lower(ifnull(substr(currency, 1, 32), '')),
			lower(ifnull(substr(\`comment\`, 1, 255), '')),
			lower(ifnull(substr(userID, 1, 255), '')),
			lower(ifnull(substr(userName, 1, 32), '')),
			lower(ifnull(substr(realDate, 1, 32),''))
		`
	}
	
	_getSuperWhere(prefix) {
		if (prefix) {
			prefix = prefix + '.'
		} else {
			prefix = ''
		}
		let verificationDateSql = this._getVerificationDateSql()
		let usersSql = this._getUsersSql()
		let sql = `
			(
				(
					(
						${prefix}\`date\` >= (${verificationDateSql})
					or 
						ifnull(${prefix}\`date\`, 0) = 0 
					or 
						length(${prefix}\`date\`) = 0
					)
				and 
					(
						${prefix}types = 'in' 
					or 
						substr(${prefix}types, 1, 6) = 'delete'
					)
					and
					${prefix}userName in (${usersSql})
				)
			or 
				(
					${prefix}types = 'balances'
					and
					(
						ifnull(${prefix}userName, 0) = 0
					or
						length(${prefix}userName) = 0
					)
				)
			or 
				(
					${prefix}types in ('rates', 'passives', 'lookout', 'verification')
					and ${prefix}userName in (${usersSql})
				)
			or 
				(
					${prefix}types in ('hidden', 'expenseChange', 'spendDates') 
					and ${prefix}userName = '${this.name}'
				)
			)
		`
		return sql
	}
	
	_getUsersSql() {
		return `
			select \`from\` 
			from finance5 
			where types = 'multiusers' and length(companyT) = 0 
				and \`to\` = '${this.name}'
			
			union
			
			select '${this.name}'
		`
	}
	
	_getVerificationDateSql() {
		let sql = `
			select max(realDate) a
			from finance5 
			where types = 'verification' 
				and (length(companyT) = 0 or companyT is null) 
				and userName = '${this.name}'
		`
		return `
			select ifnull((${sql}), 0)
		`
	}
	
	_handleIllUserBalances() {
		return new Promise(success => {
			let sql01 = `
				select companyF 
				from finance5 
				where types = 'balances' and companyF = '${this.illUser}'
			`
			this.o.Sql.commit(sql01).then(array => {
				let n = array[0]
				if (!n && (!this.illUserTypesArray || !this.illUserTypesArray.length)) {
					let sql02 = `
						insert 
						into finance5 (types, companyF, realDate) 
						select 'balances', '${this.illUser}', now()
					`
					this.o.Sql.commit(sql02)
				}
				success()
			})
		})
	}
	
	_handleIllUserLogins() {
		return new Promise(success => {
			let sql = `
				update finance5 
				set companyT = now() 
				where types = 'logins' and userName = '${this.illUser}'
			`
			this.o.Sql.commit(sql).then(data => {
				success()
			})
		})
	}
	
	_handleIllUserTypes() {
		return new Promise(async success => {
			if (this.illUserTypesArray && typeof this.illUserTypesArray == 'object') {
				for (let i = 0; i < this.illUserTypesArray.length; i++) {
					let object = this.illUserTypesArray[i]
					await this._handleIllUserType(object)
				}
			}
			success()
		})
	}
	
	_getIllUserType() {
		return new Promise(success => {
			let sql1 = this._getIllUserTypeSql1()
			let sql2 = this._getIllUserTypeSql2(sql1)
			let sql3 = this._getIllUserTypeSql3(sql1)
			let sql4 = this._getIllUserTypeSql4()
			let sql5 = this._getIllUserTypeSql5(sql2, sql3, sql4)
			let sql6 = this._getIllUserTypeSql6()
			let sql7 = this._getIllUserTypeSql7()
			let sql8 = this._getIllUserTypeSql8(sql5, sql6, sql7)
			this.o.Sql.commit(sql8).then(array => {
				this.illUserTypesArray = array
				success()
			})
		})
	}
	
	_handleIllUserType(object) {
		return new Promise(success => {
			let sql1 = `select 1`
			let sql2 = `select 2`
			let a = object['a']
			let b = object['b']
			let u = object['u']
			let n = object['n']
			
			if (b == 'insert') {
				let {sql1, sql2} = this._handleIllUserTypeInsert(a, u, n)
			} 
			if (b == 'delete') {
				let {sql1, sql2} = this._handleIllUserTypeDelete(a, u, n)
			}
			this.o.Sql.commit(sql1).then(data => {
				this.o.Sql.commit(sql2).then(data => {
					success()
				})
			})
		})
	}
	
	_handleIllUserTypeInsert(a, u, n) {
		let sql1 = `
			insert or replace
			into finance5 (types, companyF, \`from\`, realDate)
			select 'balances', '${u}', '${a}', '${n}'
		`
		let sql2 = `
			delete a 
			from finance5 a 
			join 
				(
					select companyF 
					from finance5
					where types = 'balances' and length(\`from\`) > 0 
						and (companyT is null or length(companyT) = 0) 
				)b
			on a.types = 'balances' and b.companyF = a.companyF 
				and (a.\`from\` is null or length(a.\`from\`) = 0)
		`
		return {sql1, sql2}
	}
	
	_handleIllUserTypeDelete(a, u, n) {
		let sql1 = `
			update finance5 
			set companyT = '${n}'
			where types = 'balances' and companyF = '${u}' and \`from\` = '${a}'
				and (length(a.companyT) = 0 or a.companyT is null)
		`
		let subSql01 = `
			select 1 b 
			from finance5 
			where types = 'balances' and companyF = '${u}'
				and (length(\`from\`) = 0 or \`from\` is null)
				and (length(companyT) = 0 or companyT is null)
			limit 1
		`
		let subSql02 = `
			select count(types) c 
			from finance5 
			where types = 'balances' and companyF = '${u}' and length(\`from\`) > 0
				and (length(companyT) = 0 or companyT is null)
		`
		let sql2 = `
			insert or replace 
			into finance5 (types, companyF, realDate)
			select f.t, f.userName, f.realDate 
			from
				(
					select (case when b = 0 and c > 0 then '${u}' else null end) d
					from
						(
							select ifnull((${subSql01}), 0) b, (${subSql02}) c
						)d
				)e
			join 
				(
					select 'balances' t, '${u}' userName, '${n}' realDate
				)f 
			on f.userName = e.d
		`
		return {sql1, sql2}
	}
	
	_getIllUserTypeSql1() {
		return `
			select companyF, \`from\` from finance5 a
			join (select '${this.illUser}' userName) b on b.userName = a.companyF
			where types = 'in' and length(a.\`from\`) > 0 and realDate > (now() - interval 6 month)
			group by a.\`from\`
				union
			select companyT, \`to\` \`from\` 
			from finance5 a
			join (select '${this.illUser}' userName) b on b.userName = a.companyT
			where types = 'in' and length(a.\`to\`) > 0 and a.inputType = 'в активы' 
				and realDate > (now() - interval 6 month) 
			group by a.\`to\`
		`
	}
	
	_getIllUserTypeSql2(sql1) {
		let caseSql = `
			case 
				when a.companyF = b.companyF and a.\`from\` = b.\`from\`
					and a.companyT = a.companyF and a.\`to\` = a.\`from\`
				then 0 
				else a.amount 
			end
		`
		return `
			select a.\`from\` a, sum((${caseSql}))*-1 b, currency c, -1 d
			from finance5 a
			join (${sql1}) b on a.companyF = b.companyF and a.\`from\` = b.\`from\`
			where a.types = 'in' and realDate > (now()-interval 6 month)
			group by a.\`from\`, a.currency
		`
	}
	
	_getIllUserTypeSql3(sql1) {
		return `
			select a.\`to\` a, sum(a.amount) b, currency c, 1 d 
			from finance5 a
			join (${sql1}) b on a.companyT = b.companyF and a.\`to\` = b.\`from\`
			where a.types = 'in' and realDate > (now() - interval 6 month)
			group by a.\`to\`, a.currency
		`
	}
	
	_getIllUserTypeSql4() {
		return `
			select amount b, currency c, companyT d, \`to\` n 
			from finance5 
			where types = 'verification' and realDate > (now() - interval 6 month) and companyT = 'resources'
		`
	}
	
	_getIllUserTypeSql5(sql2, sql3, sql4) {
		let caseSql = `
			case 
				when sum(a.b) < 1/100 and sum(a.b) > (-1/100)
				then 0
				else 1
			end
		`
		return `
			select a.a, sum(a.d) e 
			from
				(
					select a.a, sum(a.b) total, (${caseSql}) d
					from 
						(
							${sql2}
							union
							${sql3}
							union
							select a.n, a.b, a.c, 'v' d 
							from 
								(
									${sql4}
								)a
						)a
					group by a.a, a.c
				)a
			group by a.a
			having e > 0
		`
	}
	
	_getIllUserTypeSql6() {
		return `
			select a.\`from\` a 
			from finance5 a
			join (select '${this.illUser}' userName) b on b.userName = a.companyF
			where a.types = 'balances' and length(a.\`from\`) > 0 
				and (length(a.companyT) = 0 or a.companyT is null)
		`
	}
	
	_getIllUserTypeSql7() {
		return `
			(case
				when b.a is not null and c.a is null 
				then 'insert'
				when c.a is not null and b.a is null 
				then 'delete'
				else 0
			end)
		`
	}
	
	_getIllUserTypeSql8(sql5, sql6, sql7) {
		return `
			select t.a, ${sql7} b, now() n, '${this.illUser}' u
			from
				(
					select a.a from (${sql5})a
						union
					select a.a from (${sql6})a
				)t
			left join (${sql5}) b on t.a = b.a
			left join (${sql6}) c on t.a = c.a
			where ${sql7} != 0
		`
	}
	
	_handleTypeHidden() {
		return new Promise(success => {
			let orCases = `
				( 
					(case when length(a.companyT) > 0 and a.realDate = b.mrd then 1 else 0 end) = 1 
						or 
					(case when(length(a.companyT) = 0 or a.companyT is null) and a.realDate < b.mrd then 1 else 0 end) = 1
				)
			`
			let sql = `
				delete a from finance5 a
				join
					(
						select a.types, a.companyF, a.\`from\`, a.companyT, a.inputType, a.realDate 
						from finance5 a 
						join 
							(
								select a.types, a.companyF, a.\`from\`, a.inputType, max(a.realDate) mrd
								from finance5 a
								join (select '${this.name}' userName) b on a.userName = b.userName
								where a.types = 'hidden' 
								group by a.companyF, a.\`from\`, a.inputType
							) b 
						on a.types = 'hidden' and a.companyF = b.companyF and a.\`from\` = b.\`from\` 
							and a.inputType = b.inputType and ${orCases}
						
						union
						
						select a.types, a.companyF, a.\`from\`, a.companyT, a.inputType, a.realDate
						from finance5 a
						join
							(
								select a.types, a.inputType, max(a.companyT) mct
								from finance5 a
								join (select '${this.name}' userName) b on a.userName = b.userName
								where a.types = 'hidden' 
								group by a.inputType
							) b
						on a.types = 'hidden' and a.inputType = b.inputType and a.realDate < b.mct 
							and (length(a.companyT) = 0 or a.companyT is null)
					) b
				on a.types = 'hidden' and a.companyF = b.companyF and a.\`from\` = b.\`from\` 
					and (length(a.companyT) = 0 or a.companyT is null)
					and a.inputType = b.inputType and a.realDate = b.realDate
				where a.types = 'hidden'
			`
			this.o.Sql.commit(sql).then(data => {
				success()
			})
		})
	}
	
	_handleTypePassivesAndLookout(type) {
		return new Promise(success => {
			let addSelect = ``
			if (type == 'passives') {
				addSelect = `
					select a.* 
					from finance5 a 
					where types = '${type}' and length(a.amount) = 0
					
					union
				`
			}
			
			let addFields = ``
			if (type == 'lookout') {
				addFields = `, a.\`from\`, a.\`to\`, a.inputType, a.amount`
			}
			
			let addGroupBy = ``
			if (type == 'lookout') {
				addGroupBy = `,\`from\`, \`to\`, inputType, amount`
			}
			
			let addOn = ``
			if (type == 'lookout') {
				addOn = `
					and a.\`from\` = b.\`from\` and a.\`to\` = b.\`to\` 
					and a.inputType = b.inputType and a.amount = b.amount
				`
			}
			
			let sql = `
				delete a from finance5 a 
				join 
					(
						${addSelect}
						
						select a.* 
						from finance5 a
						join 
							(
								select a.types, companyF, max(a.companyT) mct, a.userName
									${addFields}
								from finance5 a
								join 
									(
										select '${this.name}' userName 
										union
										select \`from\` userName 
										from finance5 
										where types = 'multiusers' and \`to\` = '${this.name}'
									) u
								on a.userName = u.userName
								where a.types = '${type}'
								group by companyF ${addGroupBy}, userName
							) b
						on a.types = '${type}' and a.companyF = b.companyF 
							and (length(a.companyT) = 0 or a.companyT is null)
							and a.userName = b.userName and a.realDate < b.mct
					) b
				on b.types = a.types and b.companyF = a.companyF and b.\`from\` = a.\`from\`
					and (length(a.companyT) = 0 or a.companyT is null) 
					and b.\`to\` = a.\`to\` and b.inputType = a.inputType
					${addOn}
					and b.amount = a.amount and b.userName = a.userName and b.realDate = a.realDate
			`
			this.o.Sql.commit(sql).then(data => {
				success()
			})
		})
	}
	
	_handleTypeBalances() {
		let sql = `
			delete a from finance5 a
			join
				(
					select a.types, a.companyF, a.\`from\`, a.companyT, a.realDate
					from finance5 a
					join
						(
							select types, companyF, \`from\`, max(companyT) mct
							from finance5
							where types = 'balances' and companyT > realDate and companyT > (now() - interval 6 month)
							group by types, companyF, \`from\`
						) b
					on b.types = a.types and b.companyF = a.companyF and b.\`from\` = a.\`from\`
						and b.mct > a.realDate and (length(a.companyT) = 0 or a.companyT is null)
					
					union
					
					select a.types, a.companyF, a.\`from\`, a.companyT, a.realDate
					from finance5 a
					left join
						(
							select types, companyF, \`from\`, max(realDate) mrd
							from finance5
							where types = 'balances' and (length(companyT) = 0 or companyT is null)
							group by types, companyF, \`from\`
						) b
					on b.types = a.types and b.companyF = a.companyF 
						and b.\`from\` = a.\`from\` and b.mrd = a.realDate
					where a.types = 'balances' and (length(a.companyT) = 0 or a.companyT is null) and b.mrd is null 
				) b
			on b.types = a.types and b.companyF = a.companyF and b.\`from\` = a.\`from\` 
				and b.companyT = a.companyT and b.realDate = a.realDate
		`
		this.o.Sql.commit(sql).then(data => {
			success()
		})
	}
	
	_handleTypeRates() {
		let sql = `
			delete a from finance5 a
			join 
				(
					select a.types, a.inputType, a.amount, a.userName, a.realDate
					from finance5 a
					where a.types = 'rates' and length(a.amount) = 0
					
					union
					
					select a.types, a.inputType, a.amount, a.userName, a.realDate
					from finance5 a
					join
						(
							select a.inputType, a.userName, max(a.realDate) mrd 
							from finance5 a
							join (select '${this.name}' userName) b on a.userName = b.userName
							where a.types = 'rates' and (length(a.companyT) = 0 or a.companyT is null)
							group by a.inputType, a.userName
						) b
					on a.types='rates' and (length(a.companyT)=0 or a.companyT is null)
						and a.inputType = b.inputType and a.userName = b.userName and a.realDate < b.mrd
				) b
			on b.types = a.types and b.inputType = a.inputType and (length(a.companyT) = 0 or a.companyT is null)
				and b.amount = a.amount and b.userName = a.userName and b.realDate = a.realDate
		`
		this.o.Sql.commit(sql).then(data => {
			success()
		})
	}
	
	_handleTypeSpendDates() {
		let caseSql = `
			(case 
				when a.\`from\` = b.\`from\` and a.\`to\` = b.\`to\` and a.realDate = b.realDate 
				then 0 
				else 1 
			end)
		`
		let sql = `
			delete a from finance5 a
			join 
				(
					select a.types, a.\`from\`, a.companyT, a.\`to\`, a.userName, a.realDate
					from finance5 a
					join 
						(
							select a.types, a.\`from\`, max(a.companyT) mct, a.\`to\`, a.userName
							from finance5 a
							join (select '${this.name}'userName) u on u.userName = a.userName
							where a.types = 'spendDates' and length(a.companyT) = 19
							group by a.types, a.\`from\`, a.\`to\`, a.userName
						) b 
					on b.types = a.types and b.\`from\` = a.\`from\` 
						and (length(a.companyT) = 0 or a.companyT is null) and b.\`to\` = a.\`to\` 
						and b.userName = a.userName and b.mct >= a.realDate
					
					union
					
					select a.types, a.\`from\`, a.companyT, a.\`to\`, a.userName, a.realDate
					from finance5 a
					join 
						(
							select a.types, a.\`from\`, a.companyT, a.\`to\`, a.userName, a.realDate
							from finance5 a
							join
								(
									select a.types, a.userName, max(a.realDate) mrd
									from finance5 a
									join (select '${this.name}' userName) u on u.userName = a.userName
									where types = 'spendDates' and (length(a.companyT) = 0 or a.companyT is null)
								)b
							on b.types = a.types and (length(a.companyT) = 0 or a.companyT is null)
								and a.userName = b.userName and a.realDate = b.mrd
							limit 1
						) b
					on b.types = a.types and (length(a.companyT) = 0 or a.companyT is null)
						and ${caseSql} = 1 and a.userName = b.userName
				) b
			on b.types = a.types and b.\`from\` = a.\`from\` and (length(a.companyT) = 0 or a.companyT is null) 
				and b.\`to\` = a.\`to\` and b.userName = a.userName and b.realDate = a.realDate
		`
		this.o.Sql.commit(sql).then(data => {
			success()
		})
	}
	
	_handleTypeVerification() {
		let sql = `
			delete a from finance5 a
			join 
				(
					select a.* 
					from finance5 a
					join 
						(
							select a.types, a.userName, max(a.realDate) mrd
							from finance5 a
							join 
								(
									select '${this.name}' userName
									union 
									select \`from\` userName 
									from finance5 
									where types = 'multiusers' and \`to\` = '${this.name}'
								)u
							on a.userName = u.userName
							where a.types = 'verification'
							group by a.userName
						) b
					on a.types = b.types and a.userName = b.userName 
						and (length(a.companyT) = 0 or a.companyT is null) and a.realDate < b.mrd
					
					union
					
					select a.* 
					from finance5 a
					join 
						(
							select a.types, a.userName ,max(a.companyT) mct
							from finance5 a
							join 
								(
									select '${this.name}' userName
									union 
									select \`from\` userName 
									from finance5 
									where types = 'multiusers' and \`to\` = '${this.name}'
								)u
							on a.userName = u.userName
							where a.types = 'verification' and length(a.companyT) = 19
							group by a.userName
						) b
					on a.types = b.types and a.userName = b.userName 
						and (length(a.companyT) = 0 or a.companyT is null) and a.realDate <= b.mct
					
					union
					
					select * 
					from finance5 
					where types = 'verification' and length(companyT) > 0 and length(companyT) != 19
				) b
			on b.types = a.types and b.companyF = a.companyF and b.\`from\` = a.\`from\` 
				and (length(a.companyT) = 0 or a.companyT is null) and b.\`to\` = a.\`to\` 
				and b.inputType = a.inputType and b.amount = a.amount
				and b.userName = a.userName and b.realDate = a.realDate
		`
		this.o.Sql.commit(sql).then(data => {
			success()
		})
	}
	
	_handleTypeIn() {
		return new Promise(success => {
			let ia9 = this._getIa9()
			let ia9compareB = this._getIa9compareB()
			let sqlB = `
				select (min(a.d) - interval 1 week) md 
				from (${this.insertSQL}) a 
				where a.types = 'in' or left(a.types, 6) = 'delete'
			`
			let sqlVoid = `delete a from finance5 a
				join 
					(select ${ia9}
					from finance5 a
					join (${sqlB}) b on b.md < a.date
					where left(a.types,6) = 'delete' and a.userName = '${this.name}') b
				on ${ia9compareB} and (a.types = 'in' or a.types = 'expenseChange')
			`
			this.o.Sql.commit(sqlVoid).then(data => {
				success()
			})
		})
	}
	
	_handleTypeDelete() {
		return this._handleTypeIn()
	}
	
	_handleTypeExpenseChange() {
		return new Promise(success => {
			success()
		})
	}
	
	_getIllUser() {
		return new Promise(success => {
			let sql = `
				select userName u, rand() r
				from finance5 
				where types='logins' 
					and if(length(companyT)=0, (now() - interval 1 day), companyT) < (now() - interval 12 hour)
				order by r 
				limit 1
			`
			this.o.Sql.commit(sql).then(array => {
				if (array && array[0]) {
					this.illUser = array[0]['u']
				}
				success()
			})
		})
	}
	
	_getInsertSQL(object) {
		let sql = ``
		Object.keys(object).forEach(someDate => {
			sql += (sql ? ` union `: ``)
			let objectToString = object[someDate]
			let sqlString = this._getOneSqlString(objectToString)
			sql += sqlString
		})
		return sql
	}
	
	_getOneSqlString(object) {
		let sql = `select `
		let keys = Object.keys(object)
		keys.forEach((key, i) => {
			let value = object[key]
			let escapedKey = this._escapeQuote(key)
			let escapedValue = this._escapeQuote(value)
			sql += `'${escapedValue}'`
			sql += '`' + escapedKey + '`'
			if (keys.length - 1 != i) {
				sql += `, `
			}
		})
		return sql
	}
	
	_getSelectAll(tableName) {
		let string = ''
		let headers = ['types', 'companyF', '`from`', '`date`', 'companyT', '`to`', 'inputType']
			headers = [...headers, ...['amount', 'currency', '`comment`', 'userID', 'userName', 'realDate']]
		headers.forEach(header => {
			let comma = ', '
			if (!string) {
				comma = ''
			}
			let prefix = ''
			if (tableName) {
				prefix = tableName + '.'
			}
			string += comma + prefix + header
		})
		return string
	}
	
	_getFirstVoidSQL(selectAll, selectAllA) {
		let onDuplicateKeyUpdate = `
			\`date\` = values(\`date\`), \`currency\` = values(\`currency\`),
			\`comment\` = values(\`comment\`), \`userID\` = values(\`userID\`)
		`
		return `
			insert into finance5 (${selectAll})
			select ${selectAllA} from (${this.insertSQL}) a
			on duplicate key update ${onDuplicateKeyUpdate}
		`
	}
	
	_getSelectTableSql() {
		return `
			select a.t type
			from
				(select if( left(a.types, 6) = 'delete', left(a.types, 6), a.types)t
				from (${this.insertSQL}) a
				group by left(a.types, 8)) a
			group by a.t
		`
	}
	
	_getIa9() {
		return `
			ifnull(a.companyF, 0) companyF, ifnull(a.\`from\`, 0) \`from\`,
			ifnull(a.\`date\`, 0) \`date\`, ifnull(a.companyT, 0) companyT,
			ifnull(a.\`to\`, 0) \`to\`, ifnull(a.inputType, 0) inputType,
			ifnull(a.amount, 0) amount, ifnull(a.currency, 0) currency,
			ifnull(a.userName, 0) userName
		`
	}
	
	_getIa9compareB() {
		return `
			a.companyF = b.companyF and a.\`from\` = b.\`from\` and a.\`date\` = b.\`date\`
			and a.companyT = b.companyT and a.\`to\` = b.\`to\` and a.inputType = b.inputType
			and a.amount = b.amount and a.currency = b.currency and a.userName = b.userName
		`
	}
	
	_escapeQuote(string) {
		let escaped = (string || '')
			escaped = escaped.replace(/["]+/g, `"`)
			escaped = escaped.replace(/[']+/g, `'`)
			escaped = escaped.replace(/'/g, "\\'")
		return escaped
	}
}

module.exports = V5