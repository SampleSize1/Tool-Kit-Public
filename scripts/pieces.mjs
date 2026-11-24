/* The shell's pieces (shell/shell.css), which a tool's own styles never restyle: a value of the shell is
   changed through its variables, and a piece every tool should draw differently is changed in shell.css, once.
   Shared by the shell test and the new-tool test (the template is held to the same rule as every tool). */

export const SHELL_PIECES = ['.brand', '.brand .mark', '.brand .sub', '.prompt', '.eyebrow', '.pname', '.pmeta', '.stats', '.stat', '.panel', '.panel h3', '.seg', '.seg button', '.btn', '.btn.primary', '.hint', '.best', '.know',
	'.sec-h', '.help', '.helpbox', '.panel-foot', '.linkbtn', '.dlg', '.start-modes', '.keys-list', '.card', '.card h2', '.overlay', '.toast', '.credit', '.rail', '.rail .rg', '.leftcol', '.dock .btn', '.review', '.res-score', '.res-tiles', '.res-actions', '.pill'];

/** The selectors of a stylesheet's rules (comments taken out first), media blocks included, one per comma */
export const selectors = (css) => [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(^|[{}])\s*([^{}@][^{}]*?)\s*\{/g)]
	.map((m) => m[2].replace(/\s+/g, ' ').trim()).filter((s) => !/^(from|to|\d+%)/.test(s));
