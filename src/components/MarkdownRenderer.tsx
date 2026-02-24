import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { isMermaidBlock, parseCodeBlock } from '../lib/markdownCodeBlock';
import { Mermaid } from './Mermaid';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const components: Components = {
    code({ className, children, ...props }) {
      const { language, codeContent, isInline } = parseCodeBlock(className, children);

      if (isMermaidBlock({ language, codeContent, isInline })) {
        return <Mermaid chart={codeContent} />;
      }

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
      // Just return children since we handle pre in the code component
      return <>{children}</>;
    },
  };

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
