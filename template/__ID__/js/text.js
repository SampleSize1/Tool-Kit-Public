// @ts-check
// Every word __NAME__ shows, in English. Another language is ../lang/<code>.json ({ "ui": { …every key… } }), listed in
// the page's SiteLanguage.start; /js/language.js picks the language and looks the words up, as in every tool. The words
// every tool's screen says the same way (Explore, Learn, Test, Preferences, Go again…) are the shell's
// (../../shell/text.js): use those, never a copy. {name} in a text is filled in; { one, other } is picked by n.

export const EN = {
	home_aria: 'SampleSize_1 home page',
	sub: '__SUB__',
	tool_name: '__NAME__',
	loading: 'Loading',
	sets_aria: 'Sets',
	sets_title: 'Sets',
	set_all: 'Everything',
	settings: 'Settings',
	clean_exit: 'Exit clean view',
	stat_acc: 'Accuracy',
	stat_time: 'Time',
	stat_streak: 'Streak',
	done: 'Done',
	mode: 'Mode',
	questions: 'Questions',
	all: 'All',
	restart: 'Restart',
	clean_view: 'Clean view',
	credit: 'Made by __AUTHOR__.',
	// the "i" beside each row (the shell's floating box)
	help_rail: 'What there is to learn. Pick a set to learn just that.',
	help_study: 'Look through everything, at your own pace, with the answers shown.',
	help_practice: 'Answer questions. A miss comes back twice, soon and later.',
	help_test: 'A round of questions, timed, with no help.',
	help_size: 'How many questions a round has.',
	// the keys (the Keys window)
	key_choose: '<kbd>1</kbd>–<kbd>4</kbd> answer',
	key_next: '<kbd>Enter</kbd> next',
	key_clean: '<kbd>C</kbd> clean view',
	// what the name card says
	explore_n: '{n} of {m}',
	question_n: 'Question {n} of {m}',
	learn_left: { one: '{n} question to go', other: '{n} questions to go' },
	right: 'Right',
	wrong: 'It was {answer}',
	next: 'Next',
	previous: 'Previous',
	start_test: 'Start the test',
	test_complete: 'Test complete',
	best: 'Best: {score}/{total} in {time}',
	no_best: 'No test taken yet',
};

/** @type {any} */
let L = null;
export function useLanguage(lang) {
	L = lang;
}
export const t = (key, vars) => (L ? L.t(key, vars) : key);
export const language = () => L;
