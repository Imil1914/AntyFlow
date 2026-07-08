import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'

// Многие модели пишут формулы через \( … \) и \[ … \].
// remark-math понимает $ … $ и $$ … $$ — приводим к ним.
function normalizeMath(s: string): string {
  if (!s) return ''
  return s
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `\n$$\n${m}\n$$\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m}$`)
}

export default function MarkdownView({ content }: { content: string }) {
  return (
    <div className="flow-md">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
      >
        {normalizeMath(content)}
      </Markdown>
    </div>
  )
}
