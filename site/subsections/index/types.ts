import * as tc from '../../../_common/types'

export type share = {
	onError: tc.Starter['onError'],
	log: tc.Starter['log'],
	rabbitMQ: tc.Starter['rabbitMQ'],
	redis: tc.Starter['redis'],
	label: string,
	domain?: tc.Starter['domain'],
	currentIp: tc.Starter['currentIp'],
	anotherIp: tc.Starter['anotherIp'],
}