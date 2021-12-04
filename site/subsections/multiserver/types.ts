import * as tc from '../../../_common/types'

export type domains<Type> = {
	[domain: string]: Type
}
export type data<Type> = {
	[key: string]: Type
}

export type nowDate = number

export type container = {
	name: string,
	path: string,
	type: string,
}
export type containers = {
	[hostname: string]: container,
}

export type staticObjectDomain = {
	id: number,
	stage: string,
	domain: string,
	siblingDomain: string,
	ip?: string,
	isCurrent?: boolean,
	Containers?: containers
}
export type staticObject = {
	[domain: string]: staticObjectDomain,
}

export type props = {
	staticObject?: staticObject,
	error?: false | unknown
}

export type statisticsArray = Array<number | false>
export type statistics = {
	[hostname: string]: statisticsArray
}

type shortLogLine = {
	date: string,
	type: string,
	value: string,
}
export type shortLog = Array<shortLogLine>
export type domainShortLogsCache = {
	lastDate: string,
	shortLog: shortLog
}
export type shortLogsCache = domains<domainShortLogsCache>

type keyValue<Type> = {
	[key: string]: Type
}
export type dynamic = {
	statistics: domains<statistics>,
	shortLogDates: domains<stringOrFalse>,
	uptimeDates?: domains<tc.keyValue<string | number>>,
	roles?: domains<string>
}

export type stringOrFalse = string | false

export type share = {
	onError: tc.Starter['onError'],
	log: tc.Starter['log'],
	rabbitMQ: tc.Starter['rabbitMQ'],
	redis: tc.Starter['redis'],
	label: string,
	domain?: tc.Starter['domain'],
	currentIp: tc.Starter['currentIp'],
}