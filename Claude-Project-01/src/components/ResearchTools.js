import React from 'react';

function ResearchTools() {
  const tools = [
    {
      name: '4C Naive T Cell Explorer',
      url: 'https://ericperkey.shinyapps.io/4C_Naive_App/',
      description: 'Compares effects of Notch signaling on naive CD4 T cells in spleen and mesenteric lymph node.',
      tags: ['RNA-seq', 'Notch Signaling', 'CD4 T Cells']
    },
    {
      name: '4C Chung Alloreactive Analysis',
      url: 'https://ericperkey.shinyapps.io/4CChung/',
      description: 'Analysis of data from Chung et al. showing effects of Notch signaling on alloreactive CD4 T cells.',
      tags: ['RNA-seq', 'Alloreactive', 'GVHD']
    },
    {
      name: 'LNSC Allogeneic Response',
      url: 'https://ericperkey.shinyapps.io/LNSC_Allo/',
      description: 'Lymph node stromal cell transcriptional response to allogeneic vs syngeneic transplant.',
      tags: ['RNA-seq', 'Stromal Cells', 'Transplant']
    }
  ];

  return (
    <section id="tools" className="research-tools">
      <div className="container">
        <h2 className="section-title">PhD Research Tools</h2>
        <p className="tools-intro">
          Interactive data exploration tools from my PhD work on Notch signaling,
          T cell immunity, and graft-versus-host disease. Built with R Shiny to enable
          exploration of RNA-seq datasets from published studies.
        </p>
        <div className="tools-grid">
          {tools.map((tool, index) => (
            <a
              key={index}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="tool-card"
            >
              <div className="tool-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3 className="tool-name">{tool.name}</h3>
              <p className="tool-description">{tool.description}</p>
              <ul className="tool-tags">
                {tool.tags.map((tag, tagIndex) => (
                  <li key={tagIndex}>{tag}</li>
                ))}
              </ul>
              <span className="tool-link">
                Open App
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
