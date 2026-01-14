import React from 'react';

// KanLab custom icon component
const KanLabIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Kanban board columns */}
    <rect x="2" y="4" width="5" height="16" rx="1" fill="currentColor" opacity="0.9"/>
    <rect x="9.5" y="4" width="5" height="12" rx="1" fill="currentColor" opacity="0.7"/>
    <rect x="17" y="4" width="5" height="8" rx="1" fill="currentColor" opacity="0.5"/>
    {/* Task cards */}
    <rect x="3" y="6" width="3" height="2" rx="0.5" fill="none" stroke="currentColor" strokeWidth="0.5"/>
    <rect x="3" y="10" width="3" height="2" rx="0.5" fill="none" stroke="currentColor" strokeWidth="0.5"/>
    <rect x="10.5" y="6" width="3" height="2" rx="0.5" fill="none" stroke="currentColor" strokeWidth="0.5"/>
    <rect x="18" y="6" width="3" height="2" rx="0.5" fill="none" stroke="currentColor" strokeWidth="0.5"/>
  </svg>
);

// 4C Naive T Cell icon - T cells with CD4 marker
const NaiveTCellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Main T cell */}
    <circle cx="12" cy="10" r="6" fill="currentColor" opacity="0.3"/>
    <circle cx="12" cy="10" r="6"/>
    {/* CD4 receptor bumps */}
    <circle cx="8" cy="7" r="1.5" fill="currentColor" opacity="0.6"/>
    <circle cx="16" cy="7" r="1.5" fill="currentColor" opacity="0.6"/>
    {/* Nucleus */}
    <ellipse cx="12" cy="11" rx="3" ry="2.5" fill="currentColor" opacity="0.5"/>
    {/* "4" label */}
    <text x="12" y="22" fontSize="6" fill="currentColor" textAnchor="middle" fontWeight="bold">CD4</text>
  </svg>
);

// 4C Chung Alloreactive icon - activated T cell attacking target
const AlloreactiveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Effector T cell */}
    <circle cx="8" cy="12" r="5" fill="currentColor" opacity="0.3"/>
    <circle cx="8" cy="12" r="5"/>
    {/* Activation spikes */}
    <line x1="3" y1="8" x2="1" y2="6"/>
    <line x1="3" y1="16" x2="1" y2="18"/>
    <line x1="5" y1="6" x2="4" y2="3"/>
    {/* Target cell */}
    <circle cx="18" cy="12" r="4" strokeDasharray="2 1"/>
    {/* Attack arrow/cytokines */}
    <path d="M13 12 L14.5 12" strokeWidth="2"/>
    <circle cx="15.5" cy="10.5" r="0.8" fill="currentColor"/>
    <circle cx="15.5" cy="13.5" r="0.8" fill="currentColor"/>
    <circle cx="16.5" cy="12" r="0.8" fill="currentColor"/>
  </svg>
);

// LNSC icon - lymph node stromal cell network
const StromalCellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Lymph node outline */}
    <ellipse cx="12" cy="12" rx="10" ry="8" opacity="0.3" fill="currentColor"/>
    <ellipse cx="12" cy="12" rx="10" ry="8"/>
    {/* Stromal cell network - branching cells */}
    <circle cx="7" cy="10" r="2" fill="currentColor" opacity="0.5"/>
    <circle cx="12" cy="14" r="2" fill="currentColor" opacity="0.5"/>
    <circle cx="17" cy="10" r="2" fill="currentColor" opacity="0.5"/>
    {/* Network connections */}
    <line x1="9" y1="10" x2="10" y2="13"/>
    <line x1="14" y1="13" x2="15" y2="10"/>
    <line x1="9" y1="10" x2="15" y2="10"/>
    {/* Fibers extending */}
    <line x1="5" y1="10" x2="3" y2="9"/>
    <line x1="19" y1="10" x2="21" y2="9"/>
    <line x1="12" y1="16" x2="12" y2="19"/>
  </svg>
);

function ResearchTools() {
  const tools = [
    {
      name: 'KanLab',
      url: process.env.PUBLIC_URL + '/KanLab/index.html',
      description: 'A combined Kanban board, lab notebook, and task management system with Google Drive sync and AI API integrations. Currently in active development and personal use.',
      tags: ['React', 'Task Management', 'Lab Notebook', 'AI Integration', 'Google Drive'],
      icon: 'kanlab',
      isInternal: true,
      status: 'In Development'
    },
    {
      name: '4C Naive T Cell Explorer',
      url: 'https://ericperkey.shinyapps.io/4C_Naive_App/',
      description: 'Compares effects of Notch signaling on naive CD4 T cells in spleen and mesenteric lymph node.',
      tags: ['RNA-seq', 'Notch Signaling', 'CD4 T Cells'],
      icon: 'naive-tcell'
    },
    {
      name: '4C Chung Alloreactive Analysis',
      url: 'https://ericperkey.shinyapps.io/4CChung/',
      description: 'Analysis of data from Chung et al. showing effects of Notch signaling on alloreactive CD4 T cells.',
      tags: ['RNA-seq', 'Alloreactive', 'GVHD'],
      icon: 'alloreactive'
    },
    {
      name: 'LNSC Allogeneic Response',
      url: 'https://ericperkey.shinyapps.io/LNSC_Allo/',
      description: 'Lymph node stromal cell transcriptional response to allogeneic vs syngeneic transplant.',
      tags: ['RNA-seq', 'Stromal Cells', 'Transplant'],
      icon: 'stromal'
    }
  ];

  return (
    <section id="tools" className="research-tools">
      <div className="container">
        <h2 className="section-title">PhD Research Tools</h2>
        <p className="tools-intro">
          Interactive tools for research data exploration and lab management. Includes R Shiny apps
          for RNA-seq analysis from my PhD work, plus KanLab - a custom task and notebook system
          I'm developing for managing research projects.
        </p>
        <div className="tools-grid">
          {tools.map((tool, index) => (
            <a
              key={index}
              href={tool.url}
              target={tool.isInternal ? "_self" : "_blank"}
              rel={tool.isInternal ? undefined : "noopener noreferrer"}
              className={`tool-card ${tool.icon === 'kanlab' ? 'kanlab-card' : ''}`}
            >
              {tool.status && (
                <span className="tool-status-badge">{tool.status}</span>
              )}
              <div className={`tool-icon ${tool.icon === 'kanlab' ? 'kanlab-icon' : ''}`}>
                {tool.icon === 'kanlab' && <KanLabIcon />}
                {tool.icon === 'naive-tcell' && <NaiveTCellIcon />}
                {tool.icon === 'alloreactive' && <AlloreactiveIcon />}
                {tool.icon === 'stromal' && <StromalCellIcon />}
              </div>
              <h3 className="tool-name">{tool.name}</h3>
              <p className="tool-description">{tool.description}</p>
              <ul className="tool-tags">
                {tool.tags.map((tag, tagIndex) => (
                  <li key={tagIndex}>{tag}</li>
                ))}
              </ul>
              <span className="tool-link">
                {tool.isInternal ? 'Launch App' : 'Open App'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ResearchTools;
