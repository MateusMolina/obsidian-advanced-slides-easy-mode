import { CommentParser } from '../comment';
import { Options } from '../options';

export class FragmentProcessor {
	private parser: CommentParser;
	private orderedListRegex = /^\d[),.]/g;
	private codeBlockRegex = /```[^\n]*(?:\n[^`]*\n)```/g;

	constructor() {
		this.parser = new CommentParser();
	}

	process(markdown: string, options: Options) {
		// Detect line ranges containing Markdown code blocks so we can ignore them
		const codeBlockLines = Array.from(markdown.matchAll(this.codeBlockRegex)).map(({ 0: match, index }) => ({
			from: markdown.substring(0, index).split('\n').length - 1,
			to: markdown.substring(0, index + match.length).split('\n').length - 1,
		}));

		const output = markdown
			.split('\n')
			.map((line, lineNumber) => {
				const isCodeblockLine = codeBlockLines.some(({ from, to }) => lineNumber >= from && lineNumber <= to);
				if (isCodeblockLine) {
					return line;
				}

				if (line.trim().startsWith('- ') || this.orderedListRegex.test(line.trim())) {
					return this.transformLine(line);
				}
				return line;
			})
			.join('\n');

		return output;
	}

	transformLine(line: string) {
		const comment = this.parser.parseLine(line) ?? this.parser.buildComment('element');

		if (line.includes('<!--')) {
			line = line.substring(0, line.indexOf('<!--'));
		}

		if (!comment.hasClass('fragment')) {
			comment.addClass('fragment');
		}

		// See here: https://github.com/hakimel/reveal.js/issues/1848. This makes sure that reveals work when dealing with formatting in the list (e.g. bold / italic / code, etc.)
		const extra_replacement = '&shy;' + this.parser.commentToString(comment);
		line = line.replace('- ', '- ' + extra_replacement);
		line = line.replaceAll(this.orderedListRegex, '1. ' + extra_replacement);

		const output = line;
		return output;
	}
}
