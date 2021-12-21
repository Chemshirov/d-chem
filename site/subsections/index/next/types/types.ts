import ReactDOM from 'react-dom'
import * as t from '../../types'

export type func<Input, Output> = (input: Input) => Output
export type obj<Type> = {
	[key: string]: Type
}

export type passportProps = obj<string>

export type note = {
	date: string,
	title: string,
	text?: string,
	html?: string,
	fileName: string,
	width: number,
	height: number,
	miniName: string,
	groups: obj<boolean>,
}

type notes = {
	[noteKey: string]: note,
}

export type group = {
	dates: obj<string>,
	text: string,
}

type data = {
	groups: {
		[groupName: string]: group,
	},
	notes: notes,
}

export type fullscreenerProps = {
	data: {
		note: noteProps['note'],
		anotherDomain: noteProps['anotherDomain'],
	} | false,
	setFullscreen: ((toFullscreen: any) => void),
}
export type fullscreenerStats = {
	width: number,
	height: number,
}

export type headerLinkIndexProps = {
	name: string,
}

export type indexProps = {
	contacts?: obj<string>,
	passport?: passportProps,
	subsections?: Array<string>,
	data?: data,
	domain?: string,
	anotherDomain?: string,
}

export type indexState = {
	toFullscreen: fullscreenerProps['data'],
}

export type infoLinkIndexProps = {
	text: linkIndexProps['group']['text'] | null,
	showMore: linkIndexState['showMore'],
	handleMore: ((showMore: linkIndexState['showMore']) => void),
}

export type linkIndexProps = {
	name: string,
	group: group,
	notes: notes,
	anotherDomain: indexProps['anotherDomain'],
	setFullscreen: fullscreenerProps['setFullscreen'],
}
export type linkIndexState = {
	showMore: boolean,
}

export type mainIndexProps = {
	data: indexProps,
	setFullscreen: fullscreenerProps['setFullscreen'],
}

export type noteAtFullscreenProps = {
	data: fullscreenerProps['data'],
	fullscreenWidth: fullscreenerStats['width'],
	fullscreenHeight: fullscreenerStats['height'],
	setKeydownCallback: ((callback: fullscreenerProps['setFullscreen']) => void),
}

export type noteProps = {
	note: note,
	anotherDomain: notesProps['anotherDomain'],
	setFullscreen: notesProps['setFullscreen'],
}

export type notesProps = {
	name: linkIndexProps['name'],
	notes: Array<note>,
	showMore: linkIndexState['showMore'],
	anotherDomain: linkIndexProps['anotherDomain'],
	setFullscreen: linkIndexProps['setFullscreen'],
}

export type noteAtFullscreenStats = {
	showHeader: boolean,
}