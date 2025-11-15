const containerStyle = {
  borderRadius: "12px",
  border: "1px solid rgba(148, 163, 184, 0.5)",
  padding: "16px 18px",
  background: "linear-gradient(145deg, #0f172a 0%, #020617 60%)",
  color: "#e5e7eb",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
  fontSize: "14px",
  lineHeight: 1.5,
};

const headingBaseStyle = {
  fontWeight: 600,
  margin: "10px 0 4px",
};

const paragraphStyle = {
  margin: "4px 0",
  color: "#e5e7eb",
};

const listStyle = {
  margin: "4px 0 4px 18px",
  padding: 0,
};

const listItemStyle = {
  margin: "2px 0",
};

const codeInlineStyle = {
  fontFamily: 'Menlo, Monaco, Consolas, "SF Mono", monospace',
  fontSize: "12px",
  padding: "1px 4px",
  borderRadius: "4px",
  backgroundColor: "rgba(15, 23, 42, 0.9)",
  border: "1px solid rgba(51, 65, 85, 0.9)",
};

const hrStyle = {
  border: "none",
  borderTop: "1px solid rgba(51, 65, 85, 0.9)",
  margin: "8px 0",
};

const subtleLabelStyle = {
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9ca3af",
  marginBottom: "6px",
};

// --- Inline markdown renderer: **bold**, _italic_, `code` ---
function renderInline(text) {
  const patterns = [
    { type: "strong", regex: /\*\*(.+?)\*\*/ },
    { type: "em", regex: /_(.+?)_/ },
    { type: "code", regex: /`(.+?)`/ },
  ];

  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    let earliest = null;
    let earliestIndex = Infinity;
    let chosenPattern = null;

    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex);
      if (match && match.index < earliestIndex) {
        earliest = match;
        earliestIndex = match.index;
        chosenPattern = pattern;
      }
    }

    if (!earliest) {
      // No more matches, push remaining as plain text
      parts.push(remaining);
      break;
    }

    if (earliestIndex > 0) {
      parts.push(remaining.slice(0, earliestIndex));
    }

    const content = earliest[1];

    if (chosenPattern.type === "strong") {
      parts.push(
        <strong key={key++} style={{ fontWeight: 600 }}>
          {renderInline(content)}
        </strong>
      );
    } else if (chosenPattern.type === "em") {
      parts.push(
        <em key={key++} style={{ fontStyle: "italic" }}>
          {renderInline(content)}
        </em>
      );
    } else if (chosenPattern.type === "code") {
      parts.push(
        <code key={key++} style={codeInlineStyle}>
          {content}
        </code>
      );
    }

    remaining = remaining.slice(earliestIndex + earliest[0].length);
  }

  return parts;
}

// --- Block-level markdown parser ---
function parseBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let currentList = null;

  const flushList = () => {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      blocks.push({ type: "space" });
      continue;
    }

    let match;

    // Headings: #, ##, ###
    match = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (match) {
      flushList();
      blocks.push({
        type: "heading",
        level: match[1].length,
        content: match[2],
      });
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      flushList();
      blocks.push({ type: "hr" });
      continue;
    }

    // Unordered list
    match = trimmed.match(/^[-*]\s+(.+)/);
    if (match) {
      if (!currentList || currentList.kind !== "ul") {
        flushList();
        currentList = { type: "list", kind: "ul", items: [] };
      }
      currentList.items.push(match[1]);
      continue;
    }

    // Ordered list
    match = trimmed.match(/^\d+\.\s+(.+)/);
    if (match) {
      if (!currentList || currentList.kind !== "ol") {
        flushList();
        currentList = { type: "list", kind: "ol", items: [] };
      }
      currentList.items.push(match[1]);
      continue;
    }

    // Paragraph
    flushList();
    blocks.push({ type: "paragraph", content: trimmed });
  }

  flushList();
  return blocks;
}

// --- Main Component ---
const FormattedHandoffNotes = ({ content }) => {
  const blocks = parseBlocks(content || "");

  return (
    <div style={containerStyle}>
      <div style={subtleLabelStyle}>Handoff Notes</div>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading": {
            const levels = {
              1: { fontSize: "18px" },
              2: { fontSize: "16px" },
              3: { fontSize: "14px" },
            };
            return (
              <div
                key={index}
                style={{ ...headingBaseStyle, ...levels[block.level] }}
              >
                {renderInline(block.content)}
              </div>
            );
          }

          case "paragraph":
            return (
              <p key={index} style={paragraphStyle}>
                {renderInline(block.content)}
              </p>
            );

          case "list": {
            const ListTag = block.kind === "ol" ? "ol" : "ul";
            return (
              <ListTag key={index} style={listStyle}>
                {block.items.map((item, i) => (
                  <li key={i} style={listItemStyle}>
                    {renderInline(item)}
                  </li>
                ))}
              </ListTag>
            );
          }

          case "hr":
            return <hr key={index} style={hrStyle} />;

          case "space":
            return <div key={index} style={{ height: "6px" }} />;

          default:
            return null;
        }
      })}
    </div>
  );
};

export default FormattedHandoffNotes;
