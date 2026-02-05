import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Mermaid } from './Mermaid';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

const LANGUAGE_RE = /language-(\w+)/;

const components: Components = {
  code({ className, children, ...props }) {
    const match = LANGUAGE_RE.exec(className || '');
    const language = match ? match[1] : '';
    const codeContent = String(children).replace(/\n$/, '');

    if (language === 'mermaid') {
      return <Mermaid chart={codeContent} />;
    }

    const isInline = !className && !codeContent.includes('\n');

    if (isInline) {
      return (
        <code className="inline-code" {...props}>
          {children}
        </code>
      );
    }

    return (
      <pre className="code-block">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    );
  },
  pre({ children }) {
    return <>{children}</>;
  },
};

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeRaw];

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
