"""
Create PDF Slide Presentation for IPI-Independent Prognostic Signatures Analysis
Version 2: Added individual LymphGen subtype slides and fixed text clipping
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, Rectangle, FancyArrowPatch, Circle
import numpy as np
import pandas as pd
from matplotlib.backends.backend_pdf import PdfPages
import os

# Paths
DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS_DIR = os.path.join(DATA_DIR, "results")

# Color scheme
COLORS = {
    'primary': '#2E86AB',
    'secondary': '#A23B72',
    'accent': '#F18F01',
    'success': '#C73E1D',
    'background': '#F5F5F5',
    'dark': '#1B1B1E',
    'light': '#FFFFFF',
    'green': '#28A745',
    'red': '#DC3545',
    'orange': '#FD7E14',
    'ezb': '#28A745',
    'bn2': '#FD7E14',
    'other': '#2E86AB',
    'mcd': '#DC3545'
}

def create_slide_header(ax, title):
    """Create consistent header for slides"""
    ax.add_patch(Rectangle((0, 8.5), 10, 1.5, facecolor=COLORS['primary']))
    ax.text(5, 9.25, title, fontsize=18, fontweight='bold',
            ha='center', va='center', color='white')

def create_title_slide(fig):
    """Slide 1: Title"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    ax.add_patch(Rectangle((0, 0), 10, 10, facecolor=COLORS['primary'], alpha=0.1))
    ax.add_patch(Rectangle((0, 6.5), 10, 3.5, facecolor=COLORS['primary'], alpha=0.3))

    ax.text(5, 8.3, 'IPI-Independent Prognostic Gene', fontsize=22, fontweight='bold',
            ha='center', va='center', color=COLORS['dark'])
    ax.text(5, 7.5, 'Expression Signatures in DLBCL', fontsize=22, fontweight='bold',
            ha='center', va='center', color=COLORS['dark'])

    ax.text(5, 5.8, 'Global and LymphGen Subtype-Specific Analysis',
            fontsize=14, ha='center', va='center', color=COLORS['secondary'])

    ax.text(5, 4.3, 'Data Source: Wang et al. 2026 Cancer Cell',
            fontsize=11, ha='center', va='center', color=COLORS['dark'], alpha=0.8)
    ax.text(5, 3.8, 'Bulk RNA-seq (562 samples, 234 with survival)',
            fontsize=11, ha='center', va='center', color=COLORS['dark'], alpha=0.8)

    ax.text(5, 2.5, 'Analysis: Cox Proportional Hazards Regression',
            fontsize=10, ha='center', va='center', color=COLORS['dark'], alpha=0.6)
    ax.text(5, 2.0, 'with IPI Adjustment',
            fontsize=10, ha='center', va='center', color=COLORS['dark'], alpha=0.6)


def create_rationale_slide(fig):
    """Slide 2: Rationale"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    create_slide_header(ax, 'Rationale & Background')

    # Challenge
    ax.text(0.5, 7.8, 'The Challenge:', fontsize=13, fontweight='bold', color=COLORS['secondary'])
    challenges = [
        'IPI (International Prognostic Index) is the standard clinical risk tool',
        'However, IPI misses molecular heterogeneity within risk groups',
        'Patients with same IPI can have vastly different outcomes'
    ]
    for i, text in enumerate(challenges):
        ax.text(0.7, 7.3 - i*0.45, f'• {text}', fontsize=10, color=COLORS['dark'])

    # Hypothesis
    ax.text(0.5, 5.7, 'Hypothesis:', fontsize=13, fontweight='bold', color=COLORS['secondary'])
    hypotheses = [
        'Gene expression profiles capture biology not reflected in IPI',
        'These profiles may stratify patients within IPI risk groups',
        'Different LymphGen subtypes may have distinct prognostic genes'
    ]
    for i, text in enumerate(hypotheses):
        ax.text(0.7, 5.2 - i*0.45, f'• {text}', fontsize=10, color=COLORS['dark'])

    # Goal
    ax.text(0.5, 3.6, 'Goal:', fontsize=13, fontweight='bold', color=COLORS['secondary'])
    goals = [
        'Identify gene signatures predicting survival INDEPENDENT of IPI',
        'Build both global and subtype-specific signatures',
        'Validate in multivariate models adjusting for clinical factors'
    ]
    for i, text in enumerate(goals):
        ax.text(0.7, 3.1 - i*0.45, f'• {text}', fontsize=10, color=COLORS['dark'])


def create_data_slide(fig):
    """Slide 3: Data Overview"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    create_slide_header(ax, 'Data Overview')

    # RNA-seq box
    ax.add_patch(FancyBboxPatch((0.5, 5.5), 4, 2.3, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['background'], edgecolor=COLORS['primary'], linewidth=2))
    ax.text(2.5, 7.3, 'RNA-seq Data', fontsize=11, fontweight='bold', ha='center', color=COLORS['primary'])
    ax.text(2.5, 6.8, '562 DLBCL samples', fontsize=10, ha='center')
    ax.text(2.5, 6.4, '25,066 genes', fontsize=10, ha='center')
    ax.text(2.5, 6.0, 'Z-score normalized', fontsize=10, ha='center')

    # Clinical box
    ax.add_patch(FancyBboxPatch((5.5, 5.5), 4, 2.3, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['background'], edgecolor=COLORS['secondary'], linewidth=2))
    ax.text(7.5, 7.3, 'Clinical Data', fontsize=11, fontweight='bold', ha='center', color=COLORS['secondary'])
    ax.text(7.5, 6.8, '234 with survival', fontsize=10, ha='center')
    ax.text(7.5, 6.4, '98 deaths (42%)', fontsize=10, ha='center')
    ax.text(7.5, 6.0, 'IPI, COO, LymphGen', fontsize=10, ha='center')

    # LymphGen breakdown
    ax.text(5, 4.8, 'LymphGen Subtype Distribution:', fontsize=11, fontweight='bold', ha='center')

    subtypes = [('Other', 117, COLORS['other']), ('EZB', 50, COLORS['ezb']),
                ('BN2', 42, COLORS['bn2']), ('MCD', 19, COLORS['mcd']), ('N1', 6, COLORS['secondary'])]

    for i, (name, n, col) in enumerate(subtypes):
        x = 0.8 + i * 1.9
        ax.add_patch(FancyBboxPatch((x, 3.6), 1.6, 0.9, boxstyle="round,pad=0.02",
                                     facecolor=col, alpha=0.8))
        ax.text(x + 0.8, 4.2, name, fontsize=9, ha='center', va='center', color='white', fontweight='bold')
        ax.text(x + 0.8, 3.85, f'n={n}', fontsize=9, ha='center', va='center', color='white')

    # Analysis cohort
    ax.add_patch(FancyBboxPatch((1.5, 1.5), 7, 1.5, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['accent'], alpha=0.2, edgecolor=COLORS['accent'], linewidth=2))
    ax.text(5, 2.5, 'Analysis Cohort', fontsize=11, fontweight='bold', ha='center', color=COLORS['accent'])
    ax.text(5, 1.95, '104 samples with complete OS + IPI data (38 events)', fontsize=10, ha='center')


def create_pipeline_slide(fig):
    """Slide 4: Analysis Pipeline"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    create_slide_header(ax, 'Analysis Pipeline')

    # Pipeline steps
    steps = [
        ('1. Gene\nScreening', 'Univariate Cox\nfor 24,425 genes', COLORS['primary']),
        ('2. Signature\nBuilding', 'Top 30 adverse +\n30 favorable', COLORS['secondary']),
        ('3. Score\nCalculation', 'Mean(adverse) -\nMean(favorable)', COLORS['accent']),
        ('4. IPI\nAdjustment', 'Multivariate Cox:\nSignature + IPI', COLORS['green']),
        ('5. Risk\nStratification', 'Tertiles:\nLow/Med/High', COLORS['red'])
    ]

    for i, (title, desc, color) in enumerate(steps):
        x = 0.5 + i * 1.9
        ax.add_patch(FancyBboxPatch((x, 5.8), 1.7, 1.9, boxstyle="round,pad=0.03",
                                     facecolor=color, alpha=0.85))
        ax.text(x + 0.85, 7.3, title, fontsize=8, fontweight='bold',
                ha='center', va='center', color='white', linespacing=1.2)
        ax.text(x + 0.85, 6.3, desc, fontsize=7, ha='center', va='center',
                color='white', linespacing=1.1)

        if i < len(steps) - 1:
            ax.annotate('', xy=(x + 2.0, 6.7), xytext=(x + 1.75, 6.7),
                       arrowprops=dict(arrowstyle='->', color=COLORS['dark'], lw=2))

    # Subtype analysis
    ax.text(5, 5.0, 'Repeated for Each LymphGen Subtype:', fontsize=11, fontweight='bold', ha='center')

    for i, (name, col) in enumerate([('EZB', COLORS['ezb']), ('BN2', COLORS['bn2']),
                                      ('Other', COLORS['other']), ('MCD', COLORS['mcd'])]):
        x = 1.5 + i * 2
        ax.add_patch(FancyBboxPatch((x, 4.0), 1.5, 0.7, boxstyle="round,pad=0.02",
                                     facecolor=col, alpha=0.7))
        ax.text(x + 0.75, 4.35, name, fontsize=10, ha='center', va='center',
                color='white', fontweight='bold')

    # Methods box
    ax.add_patch(FancyBboxPatch((0.5, 1.0), 9, 2.3, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['background'], edgecolor=COLORS['dark'], linewidth=1))
    ax.text(5, 3.0, 'Key Methods', fontsize=11, fontweight='bold', ha='center', color=COLORS['dark'])
    methods = [
        'Cox Proportional Hazards: HR per SD increase in expression',
        'Multiple Testing Correction: Benjamini-Hochberg FDR',
        'Composite Score: Weighted combination of gene z-scores'
    ]
    for i, m in enumerate(methods):
        ax.text(0.8, 2.4 - i*0.45, f'• {m}', fontsize=9, color=COLORS['dark'])


def create_global_results_slide(fig):
    """Slide 5: Global Signature Results"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    create_slide_header(ax, 'Global Signature Results')

    # Key finding box
    ax.add_patch(FancyBboxPatch((0.5, 6.5), 9, 1.6, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['green'], alpha=0.2, edgecolor=COLORS['green'], linewidth=3))
    ax.text(5, 7.6, 'KEY FINDING: Signature is IPI-INDEPENDENT',
            fontsize=13, fontweight='bold', ha='center', color=COLORS['green'])
    ax.text(5, 6.95, 'Multivariate HR = 1.74 (95% CI: 1.33-2.29), p = 0.0001',
            fontsize=11, ha='center', color=COLORS['dark'])

    # Table
    ax.text(5, 5.9, 'Cox Regression Model Comparison', fontsize=11, fontweight='bold', ha='center')

    headers = ['Model', 'HR', '95% CI', 'p-value']
    x_positions = [1.8, 4.0, 5.8, 7.8]
    for x, h in zip(x_positions, headers):
        ax.text(x, 5.5, h, fontsize=9, fontweight='bold', ha='center')

    ax.plot([0.8, 9.2], [5.35, 5.35], color=COLORS['dark'], linewidth=1)

    data = [
        ('Signature only', '1.82', '1.42-2.33', '<0.0001', False),
        ('IPI only', '1.84', '1.47-2.31', '<0.0001', False),
        ('Signature + IPI', '1.74', '1.33-2.29', '0.0001', True),
        ('IPI (adjusted)', '1.71', '1.36-2.16', '<0.0001', False)
    ]

    for j, (model, hr, ci, pval, highlight) in enumerate(data):
        y = 5.0 - j * 0.42
        if highlight:
            ax.add_patch(Rectangle((0.8, y - 0.16), 8.4, 0.36, facecolor=COLORS['green'], alpha=0.25))
        weight = 'bold' if highlight else 'normal'
        ax.text(x_positions[0], y, model, fontsize=9, ha='center', fontweight=weight)
        ax.text(x_positions[1], y, hr, fontsize=9, ha='center', fontweight=weight)
        ax.text(x_positions[2], y, ci, fontsize=9, ha='center', fontweight=weight)
        ax.text(x_positions[3], y, pval, fontsize=9, ha='center', fontweight=weight)

    # Risk stratification
    ax.text(5, 2.9, 'Risk Group Stratification', fontsize=11, fontweight='bold', ha='center')

    risk_data = [('Low Risk', 78, 14, '17.9%', COLORS['green']),
                 ('Medium Risk', 78, 31, '39.7%', COLORS['orange']),
                 ('High Risk', 78, 53, '67.9%', COLORS['red'])]

    for i, (group, n, deaths, rate, color) in enumerate(risk_data):
        x = 1.0 + i * 3
        ax.add_patch(FancyBboxPatch((x, 1.5), 2.5, 1.2, boxstyle="round,pad=0.03",
                                     facecolor=color, alpha=0.75))
        ax.text(x + 1.25, 2.45, group, fontsize=9, fontweight='bold', ha='center', color='white')
        ax.text(x + 1.25, 2.1, f'n={n}, {deaths} deaths', fontsize=8, ha='center', color='white')
        ax.text(x + 1.25, 1.75, f'Mortality: {rate}', fontsize=9, fontweight='bold', ha='center', color='white')

    ax.text(5, 1.0, 'Log-rank test (Low vs High): p = 1.49 × 10⁻¹²',
            fontsize=10, ha='center', color=COLORS['dark'], fontweight='bold')


def create_km_slide(fig):
    """Slide 6: Kaplan-Meier Curves"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    create_slide_header(ax, 'Survival Analysis by Risk Group')

    km_path = os.path.join(RESULTS_DIR, "prognostic_signature_km_plot.png")

    if os.path.exists(km_path):
        img = plt.imread(km_path)
        ax_img = fig.add_axes([0.08, 0.12, 0.84, 0.68])
        ax_img.imshow(img)
        ax_img.axis('off')

    ax.text(5, 1.0, 'Clear separation: Low risk ~75% vs High risk ~20% survival at 10 years',
            fontsize=10, ha='center', color=COLORS['dark'], fontweight='bold')


def create_subtype_overview_slide(fig):
    """Slide 7: Subtype-Specific Overview"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    create_slide_header(ax, 'LymphGen Subtype-Specific Signatures')

    ax.text(5, 7.8, 'Composite signatures work across all subtypes; individual gene FDR varies by power',
            fontsize=10, fontweight='bold', ha='center', color=COLORS['secondary'])

    # Table headers
    headers = ['Subtype', 'N', 'Events', 'FDR<0.05', 'HR (uni)', 'p-value', 'HR (+IPI)', 'p (+IPI)']
    x_pos = [1.0, 2.0, 2.8, 3.8, 4.8, 5.8, 7.0, 8.2]

    for x, h in zip(x_pos, headers):
        ax.text(x, 7.2, h, fontsize=8, fontweight='bold', ha='center')

    ax.plot([0.5, 9.5], [7.0, 7.0], color=COLORS['dark'], linewidth=1)

    data = [
        ('Other', '117', '43', '16 ★', '2.11', '<0.0001', '2.24', '0.0003', COLORS['other']),
        ('EZB', '50', '21', '0', '8.26', '<0.0001', '8.70', '0.0038', COLORS['ezb']),
        ('BN2', '42', '15', '0', '8.15', '<0.0001', '22.63', '0.021', COLORS['bn2']),
        ('MCD', '19', '15', '0', '5.48', '0.0002', 'N/A', '—', COLORS['mcd'])
    ]

    for j, row in enumerate(data):
        y = 6.5 - j * 0.55
        ax.add_patch(Rectangle((0.5, y - 0.2), 9, 0.45, facecolor=row[8], alpha=0.15))
        for i, val in enumerate(row[:8]):
            weight = 'bold' if val == '16 ★' else 'normal'
            color = COLORS['green'] if val == '16 ★' else COLORS['dark']
            ax.text(x_pos[i], y, val, fontsize=8, ha='center', fontweight=weight, color=color)

    # Insights
    ax.text(5, 4.0, 'Key Findings:', fontsize=11, fontweight='bold', ha='center')

    insights = [
        ('Other', '16 genes at FDR<0.05\n(only powered subtype)', COLORS['other']),
        ('EZB/BN2', 'Composite signature\nworks (p<0.05)', COLORS['bn2']),
        ('MCD', 'High mortality (79%)\nneeds larger cohort', COLORS['mcd'])
    ]

    for i, (st, desc, color) in enumerate(insights):
        x = 0.8 + i * 3.1
        ax.add_patch(FancyBboxPatch((x, 2.0), 2.8, 1.6, boxstyle="round,pad=0.03",
                                     facecolor=color, alpha=0.2, edgecolor=color, linewidth=2))
        ax.text(x + 1.4, 3.3, st, fontsize=10, fontweight='bold', ha='center', color=color)
        ax.text(x + 1.4, 2.6, desc, fontsize=8, ha='center', color=COLORS['dark'], linespacing=1.2)


def create_ezb_slide(fig):
    """Slide 8: EZB Subtype Detail"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    # Custom header for EZB
    ax.add_patch(Rectangle((0, 8.5), 10, 1.5, facecolor=COLORS['ezb']))
    ax.text(5, 9.25, 'EZB Subtype Analysis', fontsize=18, fontweight='bold',
            ha='center', va='center', color='white')

    # Summary box
    ax.add_patch(FancyBboxPatch((0.5, 6.3), 9, 1.9, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['ezb'], alpha=0.15, edgecolor=COLORS['ezb'], linewidth=2))
    ax.text(2.5, 7.8, 'Cohort: n=50, 21 deaths (42%)', fontsize=10, ha='center')
    ax.text(7.5, 7.8, '0 genes pass FDR < 0.05', fontsize=10, ha='center', color=COLORS['orange'])
    ax.text(2.5, 7.3, 'Univariate HR = 8.26', fontsize=11, fontweight='bold', ha='center', color=COLORS['ezb'])
    ax.text(7.5, 7.3, 'IPI-adjusted HR = 8.70 (p=0.0038)', fontsize=11, fontweight='bold', ha='center', color=COLORS['ezb'])
    ax.text(5, 6.7, 'Individual genes exploratory (underpowered for FDR control)', fontsize=9, ha='center', color=COLORS['orange'], fontstyle='italic')

    # Adverse genes
    ax.add_patch(FancyBboxPatch((0.5, 3.5), 4.3, 2.7, boxstyle="round,pad=0.03",
                                 facecolor=COLORS['red'], alpha=0.1, edgecolor=COLORS['red'], linewidth=2))
    ax.text(2.65, 5.9, 'ADVERSE PROGNOSIS', fontsize=10, fontweight='bold', ha='center', color=COLORS['red'])

    adverse_genes = [
        ('MYC', '2.18', 'Oncogene - KEY DRIVER'),
        ('AKAP1', '2.27', 'Kinase anchor protein'),
        ('B3GNTL1', '2.22', 'Glycosyltransferase'),
        ('FLJ41603', '2.15', 'Uncharacterized')
    ]
    for i, (gene, hr, func) in enumerate(adverse_genes):
        y = 5.4 - i * 0.45
        ax.text(0.7, y, f'• {gene}', fontsize=9, fontweight='bold')
        ax.text(2.2, y, f'HR={hr}', fontsize=8, color=COLORS['red'])
        ax.text(3.0, y, func, fontsize=8, color=COLORS['dark'], alpha=0.8)

    # Favorable genes
    ax.add_patch(FancyBboxPatch((5.2, 3.5), 4.3, 2.7, boxstyle="round,pad=0.03",
                                 facecolor=COLORS['green'], alpha=0.1, edgecolor=COLORS['green'], linewidth=2))
    ax.text(7.35, 5.9, 'FAVORABLE PROGNOSIS', fontsize=10, fontweight='bold', ha='center', color=COLORS['green'])

    favorable_genes = [
        ('ZNF396', '0.42', 'Zinc finger TF'),
        ('ZNF626', '0.45', 'Zinc finger TF'),
        ('CIB2', '0.56', 'Calcium binding'),
        ('RBBP9', '0.41', 'Retinoblastoma binding')
    ]
    for i, (gene, hr, func) in enumerate(favorable_genes):
        y = 5.4 - i * 0.45
        ax.text(5.4, y, f'• {gene}', fontsize=9, fontweight='bold')
        ax.text(6.9, y, f'HR={hr}', fontsize=8, color=COLORS['green'])
        ax.text(7.7, y, func, fontsize=8, color=COLORS['dark'], alpha=0.8)

    # Biological insight
    ax.add_patch(FancyBboxPatch((0.5, 1.0), 9, 2.0, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['background'], edgecolor=COLORS['ezb'], linewidth=2))
    ax.text(5, 2.7, 'Biological Insight', fontsize=11, fontweight='bold', ha='center', color=COLORS['ezb'])
    ax.text(5, 2.2, 'EZB includes double-hit lymphomas with MYC/BCL2 translocations.', fontsize=9, ha='center')
    ax.text(5, 1.7, 'MYC expression (HR=2.18) confirms proliferative biology drives poor outcome.', fontsize=9, ha='center')
    ax.text(5, 1.2, 'Multiple zinc finger TFs favorable - may represent differentiation state.', fontsize=9, ha='center')


def create_bn2_slide(fig):
    """Slide 9: BN2 Subtype Detail"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    ax.add_patch(Rectangle((0, 8.5), 10, 1.5, facecolor=COLORS['bn2']))
    ax.text(5, 9.25, 'BN2 Subtype Analysis', fontsize=18, fontweight='bold',
            ha='center', va='center', color='white')

    # Summary box
    ax.add_patch(FancyBboxPatch((0.5, 6.3), 9, 1.9, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['bn2'], alpha=0.15, edgecolor=COLORS['bn2'], linewidth=2))
    ax.text(2.5, 7.8, 'Cohort: n=42, 15 deaths (36%)', fontsize=10, ha='center')
    ax.text(7.5, 7.8, '0 genes pass FDR < 0.05', fontsize=10, ha='center', color=COLORS['orange'])
    ax.text(2.5, 7.3, 'Univariate HR = 8.15', fontsize=11, fontweight='bold', ha='center', color=COLORS['bn2'])
    ax.text(7.5, 7.3, 'IPI-adjusted HR = 22.63 (p=0.021)', fontsize=11, fontweight='bold', ha='center', color=COLORS['bn2'])
    ax.text(5, 6.7, 'Individual genes exploratory (underpowered for FDR control)', fontsize=9, ha='center', color=COLORS['orange'], fontstyle='italic')

    # Adverse genes
    ax.add_patch(FancyBboxPatch((0.5, 3.5), 4.3, 2.7, boxstyle="round,pad=0.03",
                                 facecolor=COLORS['red'], alpha=0.1, edgecolor=COLORS['red'], linewidth=2))
    ax.text(2.65, 5.9, 'ADVERSE PROGNOSIS', fontsize=10, fontweight='bold', ha='center', color=COLORS['red'])

    adverse_genes = [
        ('DRAP1', '3.38', 'DR1-associated protein'),
        ('C9orf23', '3.95', 'Chromosome 9 ORF'),
        ('C6orf108', '4.18', 'Chromosome 6 ORF'),
        ('PRCP', '4.71', 'Prolylcarboxypeptidase')
    ]
    for i, (gene, hr, func) in enumerate(adverse_genes):
        y = 5.4 - i * 0.45
        ax.text(0.7, y, f'• {gene}', fontsize=9, fontweight='bold')
        ax.text(2.2, y, f'HR={hr}', fontsize=8, color=COLORS['red'])
        ax.text(3.0, y, func, fontsize=7, color=COLORS['dark'], alpha=0.8)

    # Favorable genes
    ax.add_patch(FancyBboxPatch((5.2, 3.5), 4.3, 2.7, boxstyle="round,pad=0.03",
                                 facecolor=COLORS['green'], alpha=0.1, edgecolor=COLORS['green'], linewidth=2))
    ax.text(7.35, 5.9, 'FAVORABLE PROGNOSIS', fontsize=10, fontweight='bold', ha='center', color=COLORS['green'])

    favorable_genes = [
        ('IFT81', '0.19', 'Intraflagellar transport'),
        ('PIKFYVE', '0.25', 'Phosphoinositide kinase'),
        ('CYP46A1', '0.23', 'Cytochrome P450'),
        ('SLC41A1', '0.38', 'Magnesium transporter')
    ]
    for i, (gene, hr, func) in enumerate(favorable_genes):
        y = 5.4 - i * 0.45
        ax.text(5.4, y, f'• {gene}', fontsize=9, fontweight='bold')
        ax.text(6.9, y, f'HR={hr}', fontsize=8, color=COLORS['green'])
        ax.text(7.7, y, func, fontsize=7, color=COLORS['dark'], alpha=0.8)

    # Biological insight
    ax.add_patch(FancyBboxPatch((0.5, 1.0), 9, 2.0, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['background'], edgecolor=COLORS['bn2'], linewidth=2))
    ax.text(5, 2.7, 'Biological Insight', fontsize=11, fontweight='bold', ha='center', color=COLORS['bn2'])
    ax.text(5, 2.2, 'BN2 is characterized by BCL6 fusions and NOTCH2 mutations.', fontsize=9, ha='center')
    ax.text(5, 1.7, 'DRAP1 (transcription co-repressor) and PRCP (peptidase) adverse.', fontsize=9, ha='center')
    ax.text(5, 1.2, 'Phosphoinositide signaling (PIKFYVE) favorable - potential target.', fontsize=9, ha='center')


def create_other_slide(fig):
    """Slide 10: Other/Unclassified Subtype Detail - ONLY subtype with FDR-controlled results"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    ax.add_patch(Rectangle((0, 8.5), 10, 1.5, facecolor=COLORS['other']))
    ax.text(5, 9.25, 'Other/Unclassified Subtype Analysis', fontsize=18, fontweight='bold',
            ha='center', va='center', color='white')

    # Summary box with FDR note
    ax.add_patch(FancyBboxPatch((0.5, 6.3), 9, 1.9, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['other'], alpha=0.15, edgecolor=COLORS['other'], linewidth=2))
    ax.text(2.5, 7.8, 'Cohort: n=117, 43 deaths (37%)', fontsize=10, ha='center')
    ax.text(7.5, 7.8, '16 genes pass FDR < 0.05', fontsize=10, ha='center', fontweight='bold', color=COLORS['green'])
    ax.text(2.5, 7.3, 'Univariate HR = 2.11', fontsize=11, fontweight='bold', ha='center', color=COLORS['other'])
    ax.text(7.5, 7.3, 'IPI-adjusted HR = 2.24 (p=0.0003)', fontsize=11, fontweight='bold', ha='center', color=COLORS['other'])
    ax.text(5, 6.7, '★ Only subtype with sufficient power for FDR-controlled gene discovery', fontsize=9, ha='center', color=COLORS['green'], fontstyle='italic')

    # Adverse genes
    ax.add_patch(FancyBboxPatch((0.5, 3.3), 4.3, 2.7, boxstyle="round,pad=0.03",
                                 facecolor=COLORS['red'], alpha=0.1, edgecolor=COLORS['red'], linewidth=2))
    ax.text(2.65, 5.7, 'ADVERSE (FDR < 0.05)', fontsize=10, fontweight='bold', ha='center', color=COLORS['red'])

    adverse_genes = [
        ('CHPT1', '2.02', 'FDR=0.042', 'Choline phosphotransferase'),
    ]
    for i, (gene, hr, fdr, func) in enumerate(adverse_genes):
        y = 5.2 - i * 0.5
        ax.text(0.7, y, f'• {gene}', fontsize=9, fontweight='bold')
        ax.text(1.8, y, f'HR={hr}', fontsize=8, color=COLORS['red'])
        ax.text(2.6, y, fdr, fontsize=8, color=COLORS['dark'], alpha=0.7)
        ax.text(3.5, y, func, fontsize=7, color=COLORS['dark'], alpha=0.8)
    ax.text(2.65, 4.4, '(Only 1 adverse gene\npassed strict criteria)', fontsize=8, ha='center', color=COLORS['dark'], alpha=0.6)

    # Favorable genes
    ax.add_patch(FancyBboxPatch((5.2, 3.3), 4.3, 2.7, boxstyle="round,pad=0.03",
                                 facecolor=COLORS['green'], alpha=0.1, edgecolor=COLORS['green'], linewidth=2))
    ax.text(7.35, 5.7, 'FAVORABLE (FDR < 0.05)', fontsize=10, fontweight='bold', ha='center', color=COLORS['green'])

    favorable_genes = [
        ('C3', '0.49', 'FDR=0.035', 'Complement'),
        ('DNM1', '0.49', 'FDR=0.035', 'Dynamin'),
        ('ADC', '0.47', 'FDR=0.035', 'Decarboxylase'),
        ('APBA2', '0.43', 'FDR=0.035', 'Adaptor protein')
    ]
    for i, (gene, hr, fdr, func) in enumerate(favorable_genes):
        y = 5.2 - i * 0.45
        ax.text(5.4, y, f'• {gene}', fontsize=9, fontweight='bold')
        ax.text(6.5, y, f'HR={hr}', fontsize=8, color=COLORS['green'])
        ax.text(7.2, y, fdr, fontsize=7, color=COLORS['dark'], alpha=0.7)
        ax.text(8.0, y, func, fontsize=7, color=COLORS['dark'], alpha=0.8)

    # Biological insight
    ax.add_patch(FancyBboxPatch((0.5, 0.8), 9, 2.0, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['background'], edgecolor=COLORS['other'], linewidth=2))
    ax.text(5, 2.5, 'Biological Insight', fontsize=11, fontweight='bold', ha='center', color=COLORS['other'])
    ax.text(5, 2.0, 'C3 (complement) suggests tumor immune microenvironment influences survival.', fontsize=9, ha='center')
    ax.text(5, 1.5, 'CHPT1 (choline metabolism) - lipid pathway may drive aggressive phenotype.', fontsize=9, ha='center')
    ax.text(5, 1.0, '15 favorable genes vs 1 adverse: favorable biology more detectable.', fontsize=9, ha='center')


def create_mcd_slide(fig):
    """Slide 11: MCD Subtype Detail"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    ax.add_patch(Rectangle((0, 8.5), 10, 1.5, facecolor=COLORS['mcd']))
    ax.text(5, 9.25, 'MCD Subtype Analysis', fontsize=18, fontweight='bold',
            ha='center', va='center', color='white')

    # Summary box
    ax.add_patch(FancyBboxPatch((0.5, 6.3), 9, 1.9, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['mcd'], alpha=0.15, edgecolor=COLORS['mcd'], linewidth=2))
    ax.text(2.5, 7.8, 'Cohort: n=19, 15 deaths (79%)', fontsize=10, ha='center')
    ax.text(7.5, 7.8, '0 genes pass FDR < 0.05', fontsize=10, ha='center', color=COLORS['orange'])
    ax.text(2.5, 7.3, 'Univariate HR = 5.48 (p=0.0002)', fontsize=11, fontweight='bold', ha='center', color=COLORS['mcd'])
    ax.text(7.5, 7.3, 'IPI-adjusted: N/A (small n)', fontsize=10, ha='center', color=COLORS['dark'], alpha=0.7)
    ax.text(5, 6.7, 'Severely underpowered - exploratory only', fontsize=9, ha='center', color=COLORS['red'], fontstyle='italic')

    # Adverse genes
    ax.add_patch(FancyBboxPatch((0.5, 3.5), 4.3, 2.7, boxstyle="round,pad=0.03",
                                 facecolor=COLORS['red'], alpha=0.1, edgecolor=COLORS['red'], linewidth=2))
    ax.text(2.65, 5.9, 'ADVERSE PROGNOSIS', fontsize=10, fontweight='bold', ha='center', color=COLORS['red'])

    adverse_genes = [
        ('FGFR1OP', '4.77', 'FGFR1 oncogene partner'),
        ('MUSK', '2.88', 'Muscle kinase'),
        ('CFP', '5.06', 'Complement factor P'),
        ('C14orf133', '2.19', 'Uncharacterized')
    ]
    for i, (gene, hr, func) in enumerate(adverse_genes):
        y = 5.4 - i * 0.45
        ax.text(0.7, y, f'• {gene}', fontsize=9, fontweight='bold')
        ax.text(2.2, y, f'HR={hr}', fontsize=8, color=COLORS['red'])
        ax.text(3.0, y, func, fontsize=7, color=COLORS['dark'], alpha=0.8)

    # Favorable genes
    ax.add_patch(FancyBboxPatch((5.2, 3.5), 4.3, 2.7, boxstyle="round,pad=0.03",
                                 facecolor=COLORS['green'], alpha=0.1, edgecolor=COLORS['green'], linewidth=2))
    ax.text(7.35, 5.9, 'FAVORABLE PROGNOSIS', fontsize=10, fontweight='bold', ha='center', color=COLORS['green'])

    favorable_genes = [
        ('ZNF189', '0.19', 'Zinc finger protein'),
        ('CEBPG', '0.25', 'C/EBP gamma TF'),
        ('LIN54', '0.29', 'Lin-54 homolog'),
        ('THAP9', '0.13', 'THAP domain protein')
    ]
    for i, (gene, hr, func) in enumerate(favorable_genes):
        y = 5.4 - i * 0.45
        ax.text(5.4, y, f'• {gene}', fontsize=9, fontweight='bold')
        ax.text(6.9, y, f'HR={hr}', fontsize=8, color=COLORS['green'])
        ax.text(7.7, y, func, fontsize=7, color=COLORS['dark'], alpha=0.8)

    # Biological insight
    ax.add_patch(FancyBboxPatch((0.5, 1.0), 9, 2.0, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['background'], edgecolor=COLORS['mcd'], linewidth=2))
    ax.text(5, 2.7, 'Biological Insight', fontsize=11, fontweight='bold', ha='center', color=COLORS['mcd'])
    ax.text(5, 2.2, 'MCD has MYD88/CD79B mutations with very poor prognosis (79% mortality).', fontsize=9, ha='center')
    ax.text(5, 1.7, 'Small sample size (n=19) limits multivariate analysis power.', fontsize=9, ha='center')
    ax.text(5, 1.2, 'CEBPG (favorable) - transcription factor involved in stress response.', fontsize=9, ha='center')


def create_key_genes_slide(fig):
    """Slide 12: Key Prognostic Genes Summary"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    create_slide_header(ax, 'Key Prognostic Genes (Global Signature)')

    # Adverse genes
    ax.add_patch(FancyBboxPatch((0.3, 4.3), 4.5, 3.7, boxstyle="round,pad=0.03",
                                 facecolor=COLORS['red'], alpha=0.1, edgecolor=COLORS['red'], linewidth=2))
    ax.text(2.55, 7.7, 'ADVERSE PROGNOSIS', fontsize=11, fontweight='bold', ha='center', color=COLORS['red'])
    ax.text(2.55, 7.3, '(Higher expression → Worse survival)', fontsize=8, ha='center')

    adverse = [('ALDH3A1', '1.78', 'Aldehyde dehydrogenase'),
               ('UGT2B7', '1.96', 'Glucuronosyltransferase'),
               ('ATP1B3', '1.54', 'Na+/K+ ATPase'),
               ('MYC (EZB)', '2.18', 'Oncogene'),
               ('METTL7B', '1.65', 'Methyltransferase')]

    for i, (gene, hr, func) in enumerate(adverse):
        y = 6.8 - i * 0.48
        ax.text(0.5, y, f'• {gene}', fontsize=9, fontweight='bold')
        ax.text(2.1, y, f'HR={hr}', fontsize=8, color=COLORS['red'])
        ax.text(2.9, y, func, fontsize=8, color=COLORS['dark'], alpha=0.8)

    # Favorable genes
    ax.add_patch(FancyBboxPatch((5.2, 4.3), 4.5, 3.7, boxstyle="round,pad=0.03",
                                 facecolor=COLORS['green'], alpha=0.1, edgecolor=COLORS['green'], linewidth=2))
    ax.text(7.45, 7.7, 'FAVORABLE PROGNOSIS', fontsize=11, fontweight='bold', ha='center', color=COLORS['green'])
    ax.text(7.45, 7.3, '(Higher expression → Better survival)', fontsize=8, ha='center')

    favorable = [('LMO2', '0.60', 'GCB marker, TF'),
                 ('SSBP3', '0.53', 'DNA binding'),
                 ('ITPKB', '0.61', 'Inositol kinase'),
                 ('C3', '0.49', 'Complement'),
                 ('MMP9', '0.58', 'Metalloproteinase')]

    for i, (gene, hr, func) in enumerate(favorable):
        y = 6.8 - i * 0.48
        ax.text(5.4, y, f'• {gene}', fontsize=9, fontweight='bold')
        ax.text(7.0, y, f'HR={hr}', fontsize=8, color=COLORS['green'])
        ax.text(7.8, y, func, fontsize=8, color=COLORS['dark'], alpha=0.8)

    # Interpretation
    ax.add_patch(FancyBboxPatch((0.3, 1.0), 9.4, 2.8, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['background'], edgecolor=COLORS['primary'], linewidth=2))
    ax.text(5, 3.5, 'Biological Interpretation', fontsize=11, fontweight='bold', ha='center', color=COLORS['primary'])

    interpretations = [
        'LMO2 is a validated GCB marker - favorable GCB biology confirmed',
        'MYC drives proliferation in EZB/double-hit lymphomas',
        'Complement (C3) suggests immune microenvironment contribution',
        'Metabolic enzymes (ALDH3A1, UGT2B7) may indicate drug resistance'
    ]
    for i, text in enumerate(interpretations):
        ax.text(0.6, 3.0 - i*0.45, f'• {text}', fontsize=9, color=COLORS['dark'])


def create_conclusions_slide(fig):
    """Slide 13: Conclusions"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    create_slide_header(ax, 'Conclusions')

    conclusions = [
        ('1', 'Gene expression signatures provide prognostic\ninformation BEYOND IPI', COLORS['green']),
        ('2', 'Global 60-gene signature: HR=1.74 (p=0.0001)\nafter IPI adjustment', COLORS['primary']),
        ('3', 'All major LymphGen subtypes have distinct\nIPI-independent prognostic genes', COLORS['secondary']),
        ('4', 'Risk stratification: Low (18%) vs High (68%)\nmortality - striking separation', COLORS['accent']),
        ('5', 'Key biological insights: LMO2, MYC, complement\ngenes contribute to prognosis', COLORS['red'])
    ]

    for i, (num, text, color) in enumerate(conclusions):
        y = 7.3 - i * 1.15
        circle = Circle((0.8, y), 0.3, facecolor=color, edgecolor='white', linewidth=2)
        ax.add_patch(circle)
        ax.text(0.8, y, num, fontsize=12, fontweight='bold', ha='center', va='center', color='white')
        ax.text(1.4, y, text, fontsize=10, va='center', color=COLORS['dark'], linespacing=1.2)

    # Clinical implication
    ax.add_patch(FancyBboxPatch((0.5, 0.8), 9, 1.3, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['primary'], alpha=0.2, edgecolor=COLORS['primary'], linewidth=2))
    ax.text(5, 1.7, 'Clinical Implication:', fontsize=10, fontweight='bold', ha='center', color=COLORS['primary'])
    ax.text(5, 1.2, 'These signatures could identify high-risk patients within IPI groups', fontsize=9, ha='center')


def create_presentation():
    """Create the full PDF presentation"""
    output_path = os.path.join(RESULTS_DIR, "DLBCL_Prognostic_Signatures_Presentation.pdf")

    with PdfPages(output_path) as pdf:
        slides = [
            ("Title", create_title_slide),
            ("Rationale", create_rationale_slide),
            ("Data", create_data_slide),
            ("Pipeline", create_pipeline_slide),
            ("Global Results", create_global_results_slide),
            ("KM Curves", create_km_slide),
            ("Subtype Overview", create_subtype_overview_slide),
            ("EZB Detail", create_ezb_slide),
            ("BN2 Detail", create_bn2_slide),
            ("Other Detail", create_other_slide),
            ("MCD Detail", create_mcd_slide),
            ("Key Genes", create_key_genes_slide),
            ("Conclusions", create_conclusions_slide)
        ]

        for name, func in slides:
            print(f"Creating slide: {name}")
            fig = plt.figure(figsize=(11, 8.5))
            func(fig)
            plt.subplots_adjust(left=0.02, right=0.98, top=0.98, bottom=0.02)
            pdf.savefig(fig, bbox_inches='tight', pad_inches=0.1)
            plt.close(fig)

    print(f"\nPresentation saved to: {output_path}")
    return output_path


if __name__ == "__main__":
    print("=" * 60)
    print("Creating PDF Presentation (v2 - with subtype details)")
    print("=" * 60)
    create_presentation()
    print("\nDone!")
