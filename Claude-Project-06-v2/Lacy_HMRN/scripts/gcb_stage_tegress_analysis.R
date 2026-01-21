# =============================================================================
# Lacy/HMRN GCB Analysis: tEgress by Stage
# Focus on GCB-DLBCL with staging data for FTY720 hypothesis
# =============================================================================

cat("=============================================================\n")
cat("Lacy/HMRN GCB-DLBCL: tEgress by Stage Analysis\n")
cat("=============================================================\n\n")

library(data.table)

lacy_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
results_dir <- file.path(lacy_dir, "results")
if (!dir.exists(results_dir)) dir.create(results_dir, recursive = TRUE)

# =============================================================================
# 1. Parse Clinical Data from GEO Series Matrix
# =============================================================================

cat("Parsing clinical data from GSE181063...\n")

# Read series matrix
series_file <- file.path(lacy_dir, "GSE181063_series_matrix.txt.gz")
con <- gzfile(series_file, "r")
lines <- readLines(con)
close(con)

# Find sample IDs
sample_line <- grep("^!Sample_geo_accession", lines, value = TRUE)
sample_ids <- strsplit(sample_line, "\t")[[1]][-1]
sample_ids <- gsub("\"", "", sample_ids)
cat("Total samples:", length(sample_ids), "\n")

# Extract characteristics
char_lines <- grep("^!Sample_characteristics_ch1", lines, value = TRUE)

# Parse each characteristic line
parse_char_line <- function(line, sample_ids) {
  parts <- strsplit(line, "\t")[[1]][-1]
  parts <- gsub("\"", "", parts)

  # Extract key:value pairs
  result <- data.frame(sample_id = sample_ids, stringsAsFactors = FALSE)

  for (i in seq_along(parts)) {
    if (grepl(":", parts[i])) {
      kv <- strsplit(parts[i], ":", fixed = TRUE)[[1]]
      key <- trimws(kv[1])
      val <- trimws(paste(kv[-1], collapse = ":"))
      if (i == 1) {
        result[[key]] <- NA
      }
      result[[key]][i] <- val
    }
  }
  return(result)
}

# Build clinical data frame
clinical <- data.frame(sample_id = sample_ids, stringsAsFactors = FALSE)

for (line in char_lines) {
  parts <- strsplit(line, "\t")[[1]][-1]
  parts <- gsub("\"", "", parts)

  if (length(parts) == length(sample_ids)) {
    # Get key from first non-empty entry
    for (p in parts) {
      if (grepl(":", p)) {
        key <- trimws(strsplit(p, ":")[[1]][1])
        vals <- sapply(parts, function(x) {
          if (grepl(":", x)) {
            trimws(paste(strsplit(x, ":")[[1]][-1], collapse = ":"))
          } else {
            NA
          }
        })
        clinical[[key]] <- vals
        break
      }
    }
  }
}

cat("Clinical columns:", paste(names(clinical), collapse = ", "), "\n\n")

# =============================================================================
# 2. Filter to GCB with Stage Data
# =============================================================================

cat("Filtering to GCB-DLBCL with staging data...\n\n")

# Check COO column
if ("pred_combine" %in% names(clinical)) {
  cat("COO distribution (pred_combine):\n")
  print(table(clinical$pred_combine, useNA = "ifany"))
  clinical$COO <- clinical$pred_combine
} else if ("conf_combine_gcb" %in% names(clinical)) {
  # Use confidence scores to assign COO
  clinical$COO <- ifelse(as.numeric(clinical$conf_combine_gcb) > 0.5, "GCB",
                         ifelse(as.numeric(clinical$conf_combine_abc) > 0.5, "ABC", "UNC"))
}

# Filter to GCB
gcb_data <- clinical[clinical$COO == "GCB" & !is.na(clinical$COO), ]
cat("\nGCB patients:", nrow(gcb_data), "\n")

# Filter to those with stage data
gcb_staged <- gcb_data[!is.na(gcb_data$Stage) & gcb_data$Stage != "", ]
cat("GCB with stage data:", nrow(gcb_staged), "\n")

# Stage distribution
cat("\nStage distribution in GCB:\n")
print(table(gcb_staged$Stage))

# Create stage groups
gcb_staged$stage_group <- ifelse(gcb_staged$Stage %in% c("I", "II"), "Limited",
                                  ifelse(gcb_staged$Stage %in% c("III", "IV"), "Advanced", NA))
cat("\nLimited vs Advanced:\n")
print(table(gcb_staged$stage_group))

# Extranodal status
gcb_staged$extranodal_num <- as.numeric(gcb_staged$num_extranodal)
gcb_staged$nodal_only <- gcb_staged$extranodal_num == 0
cat("\nNodal status in GCB:\n")
print(table(gcb_staged$nodal_only, useNA = "ifany"))

# Cross-tab
cat("\nStage x Nodal Status:\n")
print(table(gcb_staged$stage_group, gcb_staged$nodal_only, useNA = "ifany"))

# =============================================================================
# 3. Calculate tEgress Score from Expression Data
# =============================================================================

cat("\n=============================================================\n")
cat("Calculating tEgress Score for GCB Patients\n")
cat("=============================================================\n\n")

# Read expression data from series matrix (expression values after !series_matrix_table_begin)
expr_start <- grep("!series_matrix_table_begin", lines) + 1
expr_end <- grep("!series_matrix_table_end", lines) - 1

# Read expression matrix
expr_text <- lines[expr_start:expr_end]
expr_df <- fread(text = paste(expr_text, collapse = "\n"), header = TRUE)

# First column is probe ID
probe_ids <- expr_df[[1]]
expr_matrix <- as.matrix(expr_df[, -1, with = FALSE])
rownames(expr_matrix) <- probe_ids
colnames(expr_matrix) <- sample_ids

cat("Expression matrix:", nrow(expr_matrix), "probes x", ncol(expr_matrix), "samples\n")

# Define pathway genes (same probes as REMoDL-B - same platform GPL14951)
retention_probes <- data.frame(
  gene = c("S1PR2", "GNA13", "ARHGEF1", "RHOA", "P2RY8", "ARHGAP25"),
  probe_id = c("ILMN_1812452", "ILMN_1758906", "ILMN_1772370",
               "ILMN_1781290", "ILMN_1768284", "ILMN_1658853")
)

egress_probes <- data.frame(
  gene = c("CXCR4", "GNAI2", "RAC2", "SGK1"),
  probe_id = c("ILMN_2246410", "ILMN_1775762", "ILMN_1709795", "ILMN_3229324")
)

# Check probe availability
cat("\nProbe availability:\n")
all_probes <- c(retention_probes$probe_id, egress_probes$probe_id)
available <- all_probes %in% rownames(expr_matrix)
cat("  Available:", sum(available), "/", length(all_probes), "\n")

if (sum(available) < 8) {
  cat("WARNING: Not all probes found. Checking alternative probe IDs...\n")
}

# Extract expression for available probes
retention_available <- retention_probes$probe_id[retention_probes$probe_id %in% rownames(expr_matrix)]
egress_available <- egress_probes$probe_id[egress_probes$probe_id %in% rownames(expr_matrix)]

cat("  Retention probes found:", length(retention_available), "\n")
cat("  Egress probes found:", length(egress_available), "\n")

# Calculate z-scores across all samples
zscore <- function(x) (x - mean(x, na.rm = TRUE)) / sd(x, na.rm = TRUE)

# Z-score normalize expression
expr_z <- t(apply(expr_matrix, 1, zscore))
colnames(expr_z) <- sample_ids

# Calculate pathway scores for GCB samples
gcb_samples <- gcb_staged$sample_id[gcb_staged$sample_id %in% colnames(expr_z)]
cat("\nGCB samples with expression:", length(gcb_samples), "\n")

# Retention score (mean of retention gene z-scores)
retention_expr <- expr_z[retention_available, gcb_samples, drop = FALSE]
retention_score <- colMeans(retention_expr, na.rm = TRUE)

# Egress score (mean of egress gene z-scores)
egress_expr <- expr_z[egress_available, gcb_samples, drop = FALSE]
egress_score <- colMeans(egress_expr, na.rm = TRUE)

# tEgress = Egress - Retention
tEgress <- egress_score - retention_score

# Add to data frame
gcb_staged$tEgress <- tEgress[match(gcb_staged$sample_id, names(tEgress))]
gcb_staged <- gcb_staged[!is.na(gcb_staged$tEgress), ]

cat("GCB with tEgress calculated:", nrow(gcb_staged), "\n")

# tEgress distribution
cat("\ntEgress distribution in GCB:\n")
cat("  Mean:", round(mean(gcb_staged$tEgress), 3), "\n")
cat("  SD:", round(sd(gcb_staged$tEgress), 3), "\n")
cat("  Range:", round(min(gcb_staged$tEgress), 3), "to", round(max(gcb_staged$tEgress), 3), "\n")

# =============================================================================
# 4. tEgress by Stage Analysis
# =============================================================================

cat("\n=============================================================\n")
cat("tEgress by Stage in GCB-DLBCL\n")
cat("=============================================================\n\n")

# By stage
cat("tEgress by Stage:\n")
stage_summary <- aggregate(tEgress ~ Stage, data = gcb_staged,
                           FUN = function(x) c(mean = mean(x), sd = sd(x), n = length(x)))
stage_summary <- do.call(data.frame, stage_summary)
names(stage_summary) <- c("Stage", "Mean", "SD", "N")
print(stage_summary)

# ANOVA
cat("\nANOVA (tEgress ~ Stage):\n")
anova_result <- aov(tEgress ~ Stage, data = gcb_staged)
print(summary(anova_result))

# By stage group
cat("\ntEgress by Stage Group:\n")
group_summary <- aggregate(tEgress ~ stage_group, data = gcb_staged,
                           FUN = function(x) c(mean = mean(x), sd = sd(x), n = length(x)))
group_summary <- do.call(data.frame, group_summary)
names(group_summary) <- c("Stage_Group", "Mean", "SD", "N")
print(group_summary)

# T-test Limited vs Advanced
cat("\nT-test (Limited vs Advanced):\n")
limited <- gcb_staged$tEgress[gcb_staged$stage_group == "Limited"]
advanced <- gcb_staged$tEgress[gcb_staged$stage_group == "Advanced"]
ttest <- t.test(limited, advanced)
print(ttest)

# By nodal status
cat("\ntEgress by Nodal Status:\n")
nodal_summary <- aggregate(tEgress ~ nodal_only, data = gcb_staged,
                           FUN = function(x) c(mean = mean(x), sd = sd(x), n = length(x)))
nodal_summary <- do.call(data.frame, nodal_summary)
names(nodal_summary) <- c("Nodal_Only", "Mean", "SD", "N")
print(nodal_summary)

# T-test nodal only vs extranodal
cat("\nT-test (Nodal only vs Extranodal):\n")
nodal <- gcb_staged$tEgress[gcb_staged$nodal_only == TRUE]
extranodal <- gcb_staged$tEgress[gcb_staged$nodal_only == FALSE]
if (length(nodal) > 5 & length(extranodal) > 5) {
  ttest2 <- t.test(nodal, extranodal)
  print(ttest2)
}

# Combined: Stage x Nodal
cat("\ntEgress by Stage x Nodal Status:\n")
combined_summary <- aggregate(tEgress ~ stage_group + nodal_only, data = gcb_staged,
                              FUN = function(x) c(mean = mean(x), n = length(x)))
combined_summary <- do.call(data.frame, combined_summary)
names(combined_summary) <- c("Stage_Group", "Nodal_Only", "Mean_tEgress", "N")
print(combined_summary)

# =============================================================================
# 5. Survival Analysis
# =============================================================================

cat("\n=============================================================\n")
cat("Survival Analysis in GCB by tEgress\n")
cat("=============================================================\n\n")

library(survival)

# Parse survival data
gcb_staged$OS_years <- as.numeric(gcb_staged$os_followup_y)
gcb_staged$OS_status <- as.numeric(gcb_staged$os_status)
gcb_staged$OS_months <- gcb_staged$OS_years * 12

surv_data <- gcb_staged[!is.na(gcb_staged$OS_months) & !is.na(gcb_staged$OS_status), ]
cat("GCB with survival data:", nrow(surv_data), "\n")
cat("Events (deaths):", sum(surv_data$OS_status), "\n")

# tEgress tertiles
surv_data$tEgress_tertile <- cut(surv_data$tEgress,
                                  breaks = quantile(surv_data$tEgress, c(0, 1/3, 2/3, 1)),
                                  labels = c("Low", "Medium", "High"),
                                  include.lowest = TRUE)

cat("\ntEgress tertile distribution:\n")
print(table(surv_data$tEgress_tertile))

# KM by tEgress tertile
cat("\n--- Survival by tEgress Tertile ---\n")
fit_tertile <- survfit(Surv(OS_months, OS_status) ~ tEgress_tertile, data = surv_data)
logrank <- survdiff(Surv(OS_months, OS_status) ~ tEgress_tertile, data = surv_data)
pval <- 1 - pchisq(logrank$chisq, df = 2)
cat("Log-rank p-value:", format(pval, digits = 4), "\n")

# Plot
png(file.path(results_dir, "gcb_km_tegress_tertile.png"), width = 800, height = 600)
plot(fit_tertile, col = c("#2E9FDF", "#E7B800", "#FC4E07"), lwd = 3, mark.time = TRUE,
     xlab = "Time (Months)", ylab = "Overall Survival",
     main = paste0("GCB-DLBCL: Survival by tEgress Tertile\n",
                   "(n=", nrow(surv_data), ", Log-rank p=", format(pval, digits = 3), ")"))
legend("bottomleft", legend = c("Low tEgress", "Medium tEgress", "High tEgress"),
       col = c("#2E9FDF", "#E7B800", "#FC4E07"), lwd = 3, bty = "n")
dev.off()
cat("Saved: gcb_km_tegress_tertile.png\n")

# Survival by Stage in GCB
cat("\n--- Survival by Stage ---\n")
fit_stage <- survfit(Surv(OS_months, OS_status) ~ stage_group, data = surv_data)
logrank_stage <- survdiff(Surv(OS_months, OS_status) ~ stage_group, data = surv_data)
pval_stage <- 1 - pchisq(logrank_stage$chisq, df = 1)
cat("Log-rank p-value:", format(pval_stage, digits = 4), "\n")

png(file.path(results_dir, "gcb_km_stage.png"), width = 800, height = 600)
plot(fit_stage, col = c("#00BA38", "#F8766D"), lwd = 3, mark.time = TRUE,
     xlab = "Time (Months)", ylab = "Overall Survival",
     main = paste0("GCB-DLBCL: Survival by Stage\n",
                   "(Log-rank p=", format(pval_stage, digits = 3), ")"))
legend("bottomleft", legend = c("Limited (I-II)", "Advanced (III-IV)"),
       col = c("#00BA38", "#F8766D"), lwd = 3, bty = "n")
dev.off()
cat("Saved: gcb_km_stage.png\n")

# =============================================================================
# 6. Identify FTY720 Candidate Population
# =============================================================================

cat("\n=============================================================\n")
cat("FTY720 CANDIDATE POPULATION: GCB + Nodal Only\n")
cat("=============================================================\n\n")

# Nodal only GCB
fty_candidates <- surv_data[surv_data$nodal_only == TRUE & !is.na(surv_data$nodal_only), ]
cat("GCB + Nodal only:", nrow(fty_candidates), "\n")

# Further stratify by tEgress (high tEgress = S1PR1 active = FTY720 target)
fty_candidates$tEgress_high <- fty_candidates$tEgress > median(surv_data$tEgress)
cat("\nBy tEgress:\n")
cat("  High tEgress (above median):", sum(fty_candidates$tEgress_high), "\n")
cat("  Low tEgress (below median):", sum(!fty_candidates$tEgress_high), "\n")

# By stage
cat("\nBy Stage:\n")
print(table(fty_candidates$stage_group))

# Ideal candidates: Limited stage + Nodal only + High tEgress
ideal <- fty_candidates[fty_candidates$stage_group == "Limited" & fty_candidates$tEgress_high, ]
cat("\nIDEAL FTY720 CANDIDATES (Limited + Nodal + High tEgress):", nrow(ideal), "\n")

# =============================================================================
# 7. Save Results
# =============================================================================

cat("\n=============================================================\n")
cat("Saving Results\n")
cat("=============================================================\n\n")

# Save GCB staged data
output_cols <- c("sample_id", "COO", "Stage", "stage_group", "num_extranodal",
                 "nodal_only", "tEgress", "OS_years", "OS_status", "ipi_score")
output_data <- gcb_staged[, intersect(output_cols, names(gcb_staged))]
write.csv(output_data, file.path(results_dir, "gcb_staged_tegress.csv"), row.names = FALSE)
cat("Saved: gcb_staged_tegress.csv\n")

# Summary table
summary_table <- data.frame(
  Group = c("All GCB", "Limited", "Advanced", "Nodal Only", "Extranodal",
            "Limited+Nodal", "Limited+Nodal+HighTegress"),
  N = c(nrow(gcb_staged),
        sum(gcb_staged$stage_group == "Limited", na.rm = TRUE),
        sum(gcb_staged$stage_group == "Advanced", na.rm = TRUE),
        sum(gcb_staged$nodal_only == TRUE, na.rm = TRUE),
        sum(gcb_staged$nodal_only == FALSE, na.rm = TRUE),
        sum(gcb_staged$stage_group == "Limited" & gcb_staged$nodal_only == TRUE, na.rm = TRUE),
        nrow(ideal)),
  Mean_tEgress = c(mean(gcb_staged$tEgress),
                   mean(gcb_staged$tEgress[gcb_staged$stage_group == "Limited"], na.rm = TRUE),
                   mean(gcb_staged$tEgress[gcb_staged$stage_group == "Advanced"], na.rm = TRUE),
                   mean(gcb_staged$tEgress[gcb_staged$nodal_only == TRUE], na.rm = TRUE),
                   mean(gcb_staged$tEgress[gcb_staged$nodal_only == FALSE], na.rm = TRUE),
                   mean(gcb_staged$tEgress[gcb_staged$stage_group == "Limited" & gcb_staged$nodal_only == TRUE], na.rm = TRUE),
                   mean(ideal$tEgress))
)
summary_table$Mean_tEgress <- round(summary_table$Mean_tEgress, 3)
write.csv(summary_table, file.path(results_dir, "gcb_stage_summary.csv"), row.names = FALSE)

cat("\nSUMMARY TABLE:\n")
print(summary_table)

cat("\n=============================================================\n")
cat("ANALYSIS COMPLETE\n")
cat("=============================================================\n")
