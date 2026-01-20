"""
Create PDF Slide Presentation for TF Activity Inference Analysis
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle
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
    'dark': '#1B1B1E',
    'light': '#FFFFFF',
    'green': '#28A745',
    'red': '#DC3545',
    'orange': '#FD7E14',
    'background': '#F5F5F5',
    'ezb': '#28A745',
    'bn2': '#FD7E14',
    'other': '#2E86AB',
    'mcd': '#DC3545',
    'favorable': '#28A745',
    'adverse': '#DC3545'
}


def create_slide_header(ax, title, color=None):
    """Create consistent header for slides"""
    if color is None:
        color = COLORS['primary']
    ax.add_patch(Rectangle((0, 8.5), 10, 1.5, facecolor=color))
    ax.text(5, 9.25, title, fontsize=18, fontweight='bold',
            ha='center', va='center', color='white')


def create_title_slide(fig):
    """Slide 1: Title"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    ax.add_patch(Rectangle((0, 0), 10, 10, facecolor=COLORS['secondary'], alpha=0.1))
    ax.add_patch(Rectangle((0, 6.5), 10, 3.5, facecolor=COLORS['secondary'], alpha=0.3))

    ax.text(5, 8.3, 'Transcription Factor Activity', fontsize=22, fontweight='bold',
            ha='center', va='center', color=COLORS['dark'])
    ax.text(5, 7.5, 'Inference in DLBCL', fontsize=22, fontweight='bold',
            ha='center', va='center', color=COLORS['dark'])

    ax.text(5, 5.8, 'Identifying Master Regulators of Prognosis',
            fontsize=14, ha='center', va='center', color=COLORS['primary'])

    ax.text(5, 4.3, 'Methods: DoRothEA Regulons + ULM Activity Estimation',
            fontsize=11, ha='center', va='center', color=COLORS['dark'], alpha=0.8)
    ax.text(5, 3.8, 'Wang et al. 2026 Cancer Cell (234 samples with survival)',
            fontsize=11, ha='center', va='center', color=COLORS['dark'], alpha=0.8)

    ax.text(5, 2.5, 'Cox Proportional Hazards Regression',
            fontsize=10, ha='center', va='center', color=COLORS['dark'], alpha=0.6)
    ax.text(5, 2.0, 'with Benjamini-Hochberg FDR Correction',
            fontsize=10, ha='center', va='center', color=COLORS['dark'], alpha=0.6)


def create_rationale_slide(fig):
    """Slide 2: Rationale"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    create_slide_header(ax, 'Rationale & Approach')

    # Why TF activity?
    ax.text(0.5, 7.8, 'Why Transcription Factor Activity?', fontsize=13, fontweight='bold', color=COLORS['secondary'])
    points = [
        'TFs are master regulators controlling gene programs',
        'Individual gene expression is noisy; TF activity integrates targets',
        'TFs are often druggable or regulate druggable pathways',
        'Can reveal regulatory mechanisms beyond single-gene associations'
    ]
    for i, text in enumerate(points):
        ax.text(0.7, 7.3 - i*0.45, f'-> {text}', fontsize=10, color=COLORS['dark'])

    # Method
    ax.text(0.5, 5.2, 'Approach:', fontsize=13, fontweight='bold', color=COLORS['secondary'])
    methods = [
        'DoRothEA: Curated TF-target regulons (confidence A, B, C)',
        'ULM: Univariate Linear Model to estimate TF activity per sample',
        'Cox Regression: Test each TF activity for survival association',
        'FDR Correction: Control false discovery rate'
    ]
    for i, text in enumerate(methods):
        ax.text(0.7, 4.7 - i*0.45, f'-> {text}', fontsize=10, color=COLORS['dark'])

    # Key question
    ax.add_patch(FancyBboxPatch((0.5, 1.0), 9, 1.8, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['accent'], alpha=0.2, edgecolor=COLORS['accent'], linewidth=2))
    ax.text(5, 2.3, 'Key Question:', fontsize=12, fontweight='bold', ha='center', color=COLORS['accent'])
    ax.text(5, 1.7, 'Which transcription factors drive favorable vs adverse', fontsize=11, ha='center')
    ax.text(5, 1.3, 'prognosis in DLBCL, and do they differ by LymphGen subtype?', fontsize=11, ha='center')


def create_methods_slide(fig):
    """Slide 3: Methods Pipeline"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    create_slide_header(ax, 'Analysis Pipeline')

    # Pipeline steps
    steps = [
        ('1. Load\nDoRothEA', '429 TFs\n32,286 interactions', COLORS['primary']),
        ('2. ULM\nInference', 'Estimate TF\nactivity/sample', COLORS['secondary']),
        ('3. Cox\nRegression', 'TF activity\nvs OS', COLORS['accent']),
        ('4. FDR\nCorrection', 'BH adjustment\nq < 0.05', COLORS['green'])
    ]

    for i, (title, desc, color) in enumerate(steps):
        x = 0.8 + i * 2.3
        ax.add_patch(FancyBboxPatch((x, 5.5), 2.0, 2.2, boxstyle="round,pad=0.03",
                                     facecolor=color, alpha=0.85))
        ax.text(x + 1.0, 7.3, title, fontsize=9, fontweight='bold',
                ha='center', va='center', color='white', linespacing=1.2)
        ax.text(x + 1.0, 6.0, desc, fontsize=8, ha='center', va='center',
                color='white', linespacing=1.1)

        if i < len(steps) - 1:
            ax.annotate('', xy=(x + 2.4, 6.6), xytext=(x + 2.1, 6.6),
                       arrowprops=dict(arrowstyle='->', color=COLORS['dark'], lw=2))

    # DoRothEA explanation
    ax.add_patch(FancyBboxPatch((0.5, 2.8), 4.3, 2.2, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['background'], edgecolor=COLORS['primary'], linewidth=2))
    ax.text(2.65, 4.7, 'DoRothEA Regulons', fontsize=11, fontweight='bold', ha='center', color=COLORS['primary'])
    ax.text(2.65, 4.2, 'Curated TF-target interactions', fontsize=9, ha='center')
    ax.text(2.65, 3.7, 'Confidence A: 6,080 (highest)', fontsize=9, ha='center')
    ax.text(2.65, 3.3, 'Confidence B: 9,037', fontsize=9, ha='center')
    ax.text(2.65, 2.95, 'Confidence C: 17,169', fontsize=9, ha='center')

    # ULM explanation
    ax.add_patch(FancyBboxPatch((5.2, 2.8), 4.3, 2.2, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['background'], edgecolor=COLORS['secondary'], linewidth=2))
    ax.text(7.35, 4.7, 'ULM Method', fontsize=11, fontweight='bold', ha='center', color=COLORS['secondary'])
    ax.text(7.35, 4.2, 'For each TF and sample:', fontsize=9, ha='center')
    ax.text(7.35, 3.7, 'Fit: gene_expr ~ TF_weight', fontsize=9, ha='center', family='monospace')
    ax.text(7.35, 3.3, 'Activity = t-statistic of slope', fontsize=9, ha='center')
    ax.text(7.35, 2.95, 'Fast, robust, interpretable', fontsize=9, ha='center')

    # Sample size
    ax.text(5, 1.8, 'Analysis: 298 TFs with sufficient target coverage', fontsize=10, ha='center', fontweight='bold')
    ax.text(5, 1.3, '234 samples with overall survival data', fontsize=10, ha='center')


def create_results_overview_slide(fig):
    """Slide 4: Results Overview"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    create_slide_header(ax, 'Results Overview')

    # Key numbers
    ax.add_patch(FancyBboxPatch((0.5, 6.0), 9, 2.0, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['green'], alpha=0.15, edgecolor=COLORS['green'], linewidth=2))
    ax.text(5, 7.6, 'TF-Survival Associations Identified', fontsize=13, fontweight='bold', ha='center', color=COLORS['green'])

    stats = [
        ('298', 'TFs analyzed'),
        ('113', 'p < 0.05'),
        ('89', 'FDR < 0.10'),
        ('8', 'FDR < 0.05')
    ]
    for i, (num, label) in enumerate(stats):
        x = 1.2 + i * 2.2
        ax.text(x, 6.9, num, fontsize=20, fontweight='bold', ha='center', color=COLORS['primary'])
        ax.text(x, 6.35, label, fontsize=9, ha='center', color=COLORS['dark'])

    # Direction breakdown
    ax.text(5, 5.4, 'Direction of Association (p < 0.05):', fontsize=12, fontweight='bold', ha='center')

    # Favorable box
    ax.add_patch(FancyBboxPatch((1.0, 3.8), 3.5, 1.3, boxstyle="round,pad=0.03",
                                 facecolor=COLORS['favorable'], alpha=0.8))
    ax.text(2.75, 4.8, 'FAVORABLE', fontsize=11, fontweight='bold', ha='center', color='white')
    ax.text(2.75, 4.3, '103 TFs', fontsize=14, fontweight='bold', ha='center', color='white')
    ax.text(2.75, 3.95, 'Higher activity -> Better survival', fontsize=8, ha='center', color='white')

    # Adverse box
    ax.add_patch(FancyBboxPatch((5.5, 3.8), 3.5, 1.3, boxstyle="round,pad=0.03",
                                 facecolor=COLORS['adverse'], alpha=0.8))
    ax.text(7.25, 4.8, 'ADVERSE', fontsize=11, fontweight='bold', ha='center', color='white')
    ax.text(7.25, 4.3, '10 TFs', fontsize=14, fontweight='bold', ha='center', color='white')
    ax.text(7.25, 3.95, 'Higher activity -> Worse survival', fontsize=8, ha='center', color='white')

    # Interpretation
    ax.add_patch(FancyBboxPatch((0.5, 1.0), 9, 2.3, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['background'], edgecolor=COLORS['dark'], linewidth=1))
    ax.text(5, 3.0, 'Key Observation', fontsize=11, fontweight='bold', ha='center', color=COLORS['dark'])
    ax.text(5, 2.5, 'Strong bias toward favorable TFs (103 vs 10)', fontsize=10, ha='center')
    ax.text(5, 2.0, 'Suggests: active differentiation programs protect against death', fontsize=10, ha='center')
    ax.text(5, 1.5, 'Loss of B-cell identity TFs may drive aggressive phenotype', fontsize=10, ha='center')


def create_top_tfs_slide(fig):
    """Slide 5: Top Prognostic TFs"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    create_slide_header(ax, 'Top Prognostic Transcription Factors')

    # Load data
    try:
        cox_results = pd.read_csv(os.path.join(RESULTS_DIR, "tf_survival_cox_results.csv"))
    except:
        ax.text(5, 5, 'Data not available', ha='center')
        return

    # Favorable TFs
    ax.add_patch(FancyBboxPatch((0.3, 3.5), 4.6, 4.5, boxstyle="round,pad=0.03",
                                 facecolor=COLORS['favorable'], alpha=0.1, edgecolor=COLORS['favorable'], linewidth=2))
    ax.text(2.55, 7.7, 'FAVORABLE (FDR < 0.1)', fontsize=11, fontweight='bold', ha='center', color=COLORS['favorable'])

    favorable = cox_results[(cox_results['HR'] < 1) & (cox_results['FDR'] < 0.1)].head(10)
    headers = ['TF', 'HR', '95% CI', 'FDR']
    x_pos = [0.6, 1.8, 3.0, 4.2]
    for x, h in zip(x_pos, headers):
        ax.text(x, 7.3, h, fontsize=8, fontweight='bold', ha='center')

    for i, (_, row) in enumerate(favorable.iterrows()):
        y = 6.9 - i * 0.35
        ax.text(x_pos[0], y, row['TF'], fontsize=8, ha='center', fontweight='bold')
        ax.text(x_pos[1], y, f"{row['HR']:.2f}", fontsize=8, ha='center', color=COLORS['favorable'])
        ax.text(x_pos[2], y, f"{row['HR_lower']:.2f}-{row['HR_upper']:.2f}", fontsize=7, ha='center')
        ax.text(x_pos[3], y, f"{row['FDR']:.3f}", fontsize=8, ha='center')

    # Adverse TFs
    ax.add_patch(FancyBboxPatch((5.1, 3.5), 4.6, 4.5, boxstyle="round,pad=0.03",
                                 facecolor=COLORS['adverse'], alpha=0.1, edgecolor=COLORS['adverse'], linewidth=2))
    ax.text(7.35, 7.7, 'ADVERSE (p < 0.05)', fontsize=11, fontweight='bold', ha='center', color=COLORS['adverse'])

    adverse = cox_results[(cox_results['HR'] > 1) & (cox_results['p_value'] < 0.05)].head(10)
    x_pos2 = [5.4, 6.6, 7.8, 9.0]
    for x, h in zip(x_pos2, headers):
        ax.text(x, 7.3, h, fontsize=8, fontweight='bold', ha='center')

    for i, (_, row) in enumerate(adverse.iterrows()):
        y = 6.9 - i * 0.35
        ax.text(x_pos2[0], y, row['TF'], fontsize=8, ha='center', fontweight='bold')
        ax.text(x_pos2[1], y, f"{row['HR']:.2f}", fontsize=8, ha='center', color=COLORS['adverse'])
        ax.text(x_pos2[2], y, f"{row['HR_lower']:.2f}-{row['HR_upper']:.2f}", fontsize=7, ha='center')
        ax.text(x_pos2[3], y, f"{row['FDR']:.2f}", fontsize=8, ha='center')

    # Key TFs highlight
    ax.add_patch(FancyBboxPatch((0.3, 0.8), 9.4, 2.3, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['background'], edgecolor=COLORS['primary'], linewidth=2))
    ax.text(5, 2.8, 'Key TFs with Known DLBCL Biology', fontsize=11, fontweight='bold', ha='center', color=COLORS['primary'])

    key_tfs = [
        ('BCL6', 'HR=0.71', 'GCB master regulator - confirms GCB biology favorable'),
        ('PAX5', 'HR=0.74', 'B-cell identity TF - differentiation protective'),
        ('MYC', 'HR=1.26', 'Oncogene - proliferation drives poor outcome'),
        ('IRF8', 'HR=1.37', 'Interferon TF - chronic inflammation adverse')
    ]
    for i, (tf, hr, desc) in enumerate(key_tfs):
        y = 2.3 - i * 0.38
        color = COLORS['favorable'] if 'HR=0' in hr else COLORS['adverse']
        ax.text(0.5, y, f'{tf} ({hr}):', fontsize=9, fontweight='bold', color=color)
        ax.text(2.8, y, desc, fontsize=9, color=COLORS['dark'])


def create_forest_plot_slide(fig):
    """Slide 6: Forest Plot"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    create_slide_header(ax, 'Forest Plot: Top Prognostic TFs')

    # Embed the forest plot image if available
    forest_path = os.path.join(RESULTS_DIR, "tf_forest_plot.png")
    if os.path.exists(forest_path):
        img = plt.imread(forest_path)
        ax_img = fig.add_axes([0.08, 0.08, 0.84, 0.75])
        ax_img.imshow(img)
        ax_img.axis('off')
    else:
        ax.text(5, 4.5, 'Forest plot image not available', ha='center', fontsize=12)


def create_subtype_slide(fig):
    """Slide 7: TF Activity by LymphGen Subtype"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    create_slide_header(ax, 'TF Activity Differs by LymphGen Subtype')

    # Key finding
    ax.add_patch(FancyBboxPatch((0.5, 6.3), 9, 1.7, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['accent'], alpha=0.2, edgecolor=COLORS['accent'], linewidth=2))
    ax.text(5, 7.5, 'BCL6 Activity Highest in EZB (GCB-like)', fontsize=13, fontweight='bold', ha='center', color=COLORS['accent'])
    ax.text(5, 6.9, 'ANOVA F=20.1, p<0.0001 - strongest subtype difference', fontsize=10, ha='center')

    # Subtype comparison table
    ax.text(5, 5.8, 'Mean TF Activity by Subtype (Top TFs with Subtype Differences)', fontsize=11, fontweight='bold', ha='center')

    # Table headers
    headers = ['TF', 'EZB', 'BN2', 'MCD', 'Other', 'ANOVA p']
    x_pos = [1.0, 2.5, 3.8, 5.1, 6.4, 8.0]
    colors_sub = [COLORS['dark'], COLORS['ezb'], COLORS['bn2'], COLORS['mcd'], COLORS['other'], COLORS['dark']]

    for x, h, c in zip(x_pos, headers, colors_sub):
        ax.text(x, 5.4, h, fontsize=9, fontweight='bold', ha='center', color=c)

    ax.plot([0.5, 9.5], [5.25, 5.25], color=COLORS['dark'], linewidth=1)

    # Data rows
    data = [
        ('BCL6', '2.23', '1.89', '1.61', '1.91', '<0.0001'),
        ('RBPJ', '5.12', '5.16', '4.54', '5.08', '<0.0001'),
        ('MEF2B', '5.60', '5.25', '4.84', '5.31', '<0.0001'),
        ('EBF1', '6.69', '6.89', '5.93', '6.86', '0.0001'),
        ('MEIS2', '4.55', '4.45', '3.84', '4.63', '<0.0001'),
    ]

    for j, row in enumerate(data):
        y = 4.9 - j * 0.45
        for i, val in enumerate(row):
            weight = 'bold' if i == 0 else 'normal'
            ax.text(x_pos[i], y, val, fontsize=9, ha='center', fontweight=weight)

    # MCD insight
    ax.add_patch(FancyBboxPatch((0.5, 1.0), 9, 2.0, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['mcd'], alpha=0.15, edgecolor=COLORS['mcd'], linewidth=2))
    ax.text(5, 2.7, 'MCD Subtype Shows Globally Lower Favorable TF Activity', fontsize=11, fontweight='bold', ha='center', color=COLORS['mcd'])
    ax.text(5, 2.2, 'BCL6, RBPJ, MEF2B, EBF1 all lower in MCD vs other subtypes', fontsize=10, ha='center')
    ax.text(5, 1.7, 'May explain the particularly poor prognosis of MCD (79% mortality)', fontsize=10, ha='center')
    ax.text(5, 1.2, 'Hypothesis: MCD lacks protective B-cell differentiation programs', fontsize=10, ha='center', fontstyle='italic')


def create_heatmap_slide(fig):
    """Slide 8: Heatmap visualization"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    create_slide_header(ax, 'TF Activity Patterns Across Subtypes')

    # Embed the heatmap image if available
    heatmap_path = os.path.join(RESULTS_DIR, "tf_activity_analysis.png")
    if os.path.exists(heatmap_path):
        img = plt.imread(heatmap_path)
        ax_img = fig.add_axes([0.05, 0.08, 0.90, 0.75])
        ax_img.imshow(img)
        ax_img.axis('off')
    else:
        ax.text(5, 4.5, 'Heatmap image not available', ha='center', fontsize=12)


def create_hypotheses_slide(fig):
    """Slide 9: Novel Biological Hypotheses"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    create_slide_header(ax, 'Novel Biological Hypotheses', COLORS['secondary'])

    hypotheses = [
        ('1', 'BCL6 Activity Drives Favorable Outcome',
         'BCL6 is the master regulator of the germinal center reaction.\n'
         'High activity -> maintained GCB differentiation -> chemosensitivity.\n'
         'Implication: BCL6-inducing therapies may improve outcome.',
         COLORS['favorable']),

        ('2', 'Interferon Response Predicts Poor Outcome',
         'IRF1, IRF8 activity associated with worse survival.\n'
         'May indicate chronic inflammatory microenvironment.\n'
         'Hypothesis: Interferon-driven immune exhaustion promotes resistance.',
         COLORS['adverse']),

        ('3', 'MCD Lacks Protective Differentiation Programs',
         'Globally lower BCL6, RBPJ, MEF2B, EBF1 activity.\n'
         'Loss of B-cell identity TFs may drive aggressive phenotype.\n'
         'Therapeutic target: restore differentiation programs in MCD.',
         COLORS['mcd']),

        ('4', 'Notch Pathway (RBPJ) is Protective',
         'RBPJ (Notch effector) HR=0.70 (FDR=0.05).\n'
         'Active Notch signaling may maintain differentiated state.\n'
         'Contrast with solid tumors where Notch is often oncogenic.',
         COLORS['primary']),
    ]

    y_start = 7.8
    for i, (num, title, text, color) in enumerate(hypotheses):
        y = y_start - i * 1.7
        circle = Circle((0.6, y), 0.25, facecolor=color, edgecolor='white', linewidth=2)
        ax.add_patch(circle)
        ax.text(0.6, y, num, fontsize=11, fontweight='bold', ha='center', va='center', color='white')
        ax.text(1.0, y + 0.1, title, fontsize=10, fontweight='bold', va='center', color=color)
        ax.text(1.0, y - 0.45, text, fontsize=8, va='top', color=COLORS['dark'], linespacing=1.3)


def create_conclusions_slide(fig):
    """Slide 10: Conclusions"""
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    create_slide_header(ax, 'Conclusions')

    conclusions = [
        ('1', 'TF activity inference identifies master regulators\nof DLBCL prognosis beyond single genes', COLORS['primary']),
        ('2', 'BCL6 activity predicts favorable outcome (HR=0.71)\nconfirming GCB biology is protective', COLORS['favorable']),
        ('3', 'Interferon TFs (IRF1, IRF8) and MYC predict\npoor outcome - inflammation + proliferation', COLORS['adverse']),
        ('4', 'MCD subtype shows globally depressed favorable\nTF activity - loss of differentiation', COLORS['mcd']),
        ('5', '103 favorable vs 10 adverse TFs suggest\nactive differentiation programs are protective', COLORS['secondary'])
    ]

    for i, (num, text, color) in enumerate(conclusions):
        y = 7.5 - i * 1.2
        circle = Circle((0.7, y), 0.28, facecolor=color, edgecolor='white', linewidth=2)
        ax.add_patch(circle)
        ax.text(0.7, y, num, fontsize=11, fontweight='bold', ha='center', va='center', color='white')
        ax.text(1.2, y, text, fontsize=10, va='center', color=COLORS['dark'], linespacing=1.3)

    # Future directions
    ax.add_patch(FancyBboxPatch((0.5, 0.7), 9, 1.5, boxstyle="round,pad=0.05",
                                 facecolor=COLORS['accent'], alpha=0.2, edgecolor=COLORS['accent'], linewidth=2))
    ax.text(5, 1.8, 'Future Directions:', fontsize=11, fontweight='bold', ha='center', color=COLORS['accent'])
    ax.text(5, 1.3, 'Validate BCL6/IRF signatures in independent cohorts; Test BCL6-inducing agents in MCD', fontsize=9, ha='center')


def create_presentation():
    """Create the full PDF presentation"""
    output_path = os.path.join(RESULTS_DIR, "TF_Activity_Inference_Presentation.pdf")

    with PdfPages(output_path) as pdf:
        slides = [
            ("Title", create_title_slide),
            ("Rationale", create_rationale_slide),
            ("Methods", create_methods_slide),
            ("Results Overview", create_results_overview_slide),
            ("Top TFs", create_top_tfs_slide),
            ("Forest Plot", create_forest_plot_slide),
            ("Subtype Comparison", create_subtype_slide),
            ("Heatmap", create_heatmap_slide),
            ("Hypotheses", create_hypotheses_slide),
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
    print("Creating TF Activity Inference Presentation")
    print("=" * 60)
    create_presentation()
    print("\nDone!")
