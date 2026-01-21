# dbGaP Access Application Guide
## Study: phs001444 (NCICCR-DLBCL / Schmitz et al. 2018)

## Overview

- **Study ID**: phs001444.v1.p1
- **Study Name**: Genetics and Pathogenesis of Diffuse Large B Cell Lymphoma
- **Data Needed**: Controlled-access mutation (MAF) files
- **Typical Approval Time**: 2-4 weeks

---

## Step 1: Prerequisites

### 1.1 eRA Commons Account
- Required for NIH data access
- If you don't have one, your institution's research office can help
- URL: https://public.era.nih.gov/commonsplus/

### 1.2 Institutional Requirements
- [ ] PI (Principal Investigator) status or PI sponsor
- [ ] Institutional Signing Official (SO) - usually in Sponsored Programs office
- [ ] IRB determination (exempt or approved protocol)

---

## Step 2: Start Application

### 2.1 Go to dbGaP
**URL**: https://dbgap.ncbi.nlm.nih.gov/aa/wga.cgi?page=login

### 2.2 Find the Study
1. Search for: `phs001444`
2. Or direct link: https://www.ncbi.nlm.nih.gov/projects/gap/cgi-bin/study.cgi?study_id=phs001444.v1.p1

### 2.3 Click "Request Access"

---

## Step 3: Complete Data Access Request (DAR)

### 3.1 Research Use Statement (Template)

```
Title: Validation of GC B-cell Positioning Pathway Mutations as Prognostic
Markers in DLBCL

Purpose: We are conducting a secondary analysis to validate findings from the
Chapuy et al. 2018 DLBCL cohort. Specifically, we identified that mutations in
GC B-cell positioning pathway genes (S1PR2, GNA13, ARHGEF1, P2RY8, RHOA, CXCR4,
GNAI2, RAC2, ARHGAP25) are associated with poor survival in the EZB genetic
subtype. We seek to validate this "Egress Score" in the independent Schmitz/NCI
cohort which has similar genetic subtype classifications.

Methods: We will:
1. Extract mutations in the 9 pathway genes from WES data
2. Calculate Egress Scores for each patient
3. Perform Kaplan-Meier survival analysis stratified by genetic subtype (EZB)
4. Compare results with our Chapuy cohort findings

Data Requested:
- Somatic mutation calls (MAF files)
- Clinical data including overall survival
- Genetic subtype classifications

No identifiable information will be used. All analyses will be performed on
de-identified data. Results will be reported only in aggregate.
```

### 3.2 Required Certifications
- [ ] Data Use Certification (DUC) - agreeing to data use terms
- [ ] Institutional certification
- [ ] No re-identification attempts
- [ ] Proper data security measures

---

## Step 4: Institutional Sign-Off

Your Signing Official (SO) will need to:
1. Review your DAR
2. Certify institutional compliance
3. Electronically sign the request

Contact your institution's:
- Office of Sponsored Programs
- Research Compliance Office
- Or equivalent administrative office

---

## Step 5: After Approval

### 5.1 Download Data
Once approved, you'll receive access to download via:
- GDC Data Portal (with token)
- GDC Data Transfer Tool

### 5.2 Files You'll Get
- `MAF_NCICCR-DLBCL_phs001444.txt` - Aggregated somatic mutations
- Individual sample MAF files
- Clinical annotations

---

## Timeline

| Step | Typical Duration |
|------|------------------|
| Prepare DAR | 1-2 days |
| Institutional review | 3-7 days |
| dbGaP/NIH review | 1-3 weeks |
| **Total** | **2-4 weeks** |

---

## Quick Links

- dbGaP Login: https://dbgap.ncbi.nlm.nih.gov/aa/wga.cgi?page=login
- Study Page: https://www.ncbi.nlm.nih.gov/projects/gap/cgi-bin/study.cgi?study_id=phs001444.v1.p1
- GDC Portal: https://portal.gdc.cancer.gov/projects/NCICCR-DLBCL
- dbGaP Help: https://www.ncbi.nlm.nih.gov/books/NBK5295/

---

## Contact

For dbGaP questions: dbgap-help@ncbi.nlm.nih.gov

---

*Guide created: January 2026*
*Project: GC B-cell Positioning Pathway Analysis*
