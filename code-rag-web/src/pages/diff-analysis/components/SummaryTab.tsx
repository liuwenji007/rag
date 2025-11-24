import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

interface SummaryTabProps {
  summary: string;
}

export default function SummaryTab({ summary }: SummaryTabProps) {
  const components: Components = {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const codeString = String(children).replace(/\n$/, '');
      
      return language ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          {...(props as Record<string, unknown>)}
        >
          {codeString}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    a({ href, children, ...props }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#007bff', textDecoration: 'none' }}
          {...props}
        >
          {children}
        </a>
      );
    },
  };

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
      }}
    >
      <ReactMarkdown components={components}>{summary}</ReactMarkdown>
    </div>
  );
}

