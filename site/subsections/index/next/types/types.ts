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

export type eventHandler = (event: KeyboardEvent, noPrevent?: boolean) => void

export type fullscreenerProps = {
	data?: {
		note: noteProps['note'],
		anotherDomain: noteProps['anotherDomain'],
	},
	setFullscreen: ((toFullscreen: any) => void),
	setEventHandler: ((name: string, eventHandler: eventHandler) => void),
	setKeydownBlock: ((keyCode: number | string, name?: string) => void),
	keydownBlocks: indexState['keydownBlocks'],
}
export type fullscreenerState = {
	width: number,
	height: number,
}

export type headerLinkIndexProps = {
	name: string,
}

export type imageProps = {
	url: note['fileName'],
	anotherDomain?: fullscreenerProps['data']['anotherDomain'],
	title: note['title'],
	alt: string,
	frameWidth: noteAtFullscreenProps['fullscreenWidth'],
	frameHeight: noteAtFullscreenProps['fullscreenHeight'],
	imageWidth: note['width'],
	imageHeight: note['height'],
	setOnEventCallback: ((type: string, callback: any) => void),
}
export type imageState = {
	mediumImageSrc: string | null,
	mediumImageWidth: number,
	mediumImageHeight: number,
	bigImageSrc: string | null,
	top: number,
	left: number,
	width: number,
	height: number,
	scale: number,
	translateY: number,
	translateX: number,
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
	keydownBlocks: {
		[keyCode: number | string]: string
	},
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
	fullscreenWidth: fullscreenerState['width'],
	fullscreenHeight: fullscreenerState['height'],
	setEventHandler: fullscreenerProps['setEventHandler'],
	setKeydownBlock: fullscreenerProps['setKeydownBlock'],
}
export type noteAtFullscreenState = {
	showHeader: boolean,
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