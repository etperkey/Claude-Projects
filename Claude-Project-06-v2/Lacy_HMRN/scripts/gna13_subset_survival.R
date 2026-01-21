library(survival)

data <- read.csv("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Lacy_HMRN/data/genetic_egress_scores.csv")
data$OS_MONTHS <- data$OS_time / 30.44
data$OS_EVENT <- data$OS_status

cat("=============================================================================\n")
cat("GNA13 OS Analysis in GCB, SGK1, and BCL2 Subsets\n")
cat("=============================================================================\n\n")

analyze_subset <- function(subset_data, label) {
  n <- nrow(subset_data)
  n_gna13 <- sum(subset_data$GNA13)
  n_wt <- n - n_gna13
  events <- sum(subset_data$OS_EVENT)

  cat(sprintf("\n--- %s (n=%d, GNA13=%d [%.1f%%], events=%d) ---\n",
              label, n, n_gna13, 100*n_gna13/n, events))

  if (n_gna13 < 3 || n_wt < 3) {
    cat("  Insufficient GNA13 mutations for analysis\n")
    return(NULL)
  }

  # Median OS by group
  fit <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ GNA13, data = subset_data)
  cat("\n  Median OS (months):\n")
  tbl <- summary(fit)$table
  print(tbl[, c("records", "events", "median", "0.95LCL", "0.95UCL")])

  # Log-rank test
  logrank <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ GNA13, data = subset_data)
  pval <- 1 - pchisq(logrank$chisq, df = 1)
  cat(sprintf("\n  Log-rank p-value: %.4f\n", pval))

  # Cox regression
  cox <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ GNA13, data = subset_data)
  hr <- exp(coef(cox))
  ci <- exp(confint(cox))
  cox_p <- summary(cox)$coefficients[, "Pr(>|z|)"]

  cat(sprintf("  Cox HR: %.3f (95%% CI: %.3f - %.3f)\n", hr, ci[1], ci[2]))
  cat(sprintf("  Cox p-value: %.4f\n", cox_p))

  direction <- ifelse(hr < 1, "PROTECTIVE (Better)", "HARMFUL (Worse)")
  sig <- ifelse(cox_p < 0.05, "SIGNIFICANT", "Not significant")
  cat(sprintf("  Direction: %s [%s]\n", direction, sig))

  return(data.frame(
    Subset = label,
    N = n,
    N_GNA13 = n_gna13,
    Pct = round(100*n_gna13/n, 1),
    Events = events,
    HR = round(hr, 3),
    CI_lower = round(ci[1], 3),
    CI_upper = round(ci[2], 3),
    P_value = round(cox_p, 4),
    Direction = ifelse(hr < 1, "Protective", "Harmful"),
    Significant = cox_p < 0.05
  ))
}

results <- data.frame()

# GCB COO
gcb_data <- data[data$cell_of_origin == "GCB" & !is.na(data$OS_MONTHS), ]
res <- analyze_subset(gcb_data, "GCB (COO)")
if (!is.null(res)) results <- rbind(results, res)

# SGK1 cluster
sgk1_data <- data[data$cluster_ICL == "SGK1" & !is.na(data$OS_MONTHS), ]
res <- analyze_subset(sgk1_data, "SGK1 Cluster")
if (!is.null(res)) results <- rbind(results, res)

# BCL2 cluster
bcl2_data <- data[data$cluster_ICL == "BCL2" & !is.na(data$OS_MONTHS), ]
res <- analyze_subset(bcl2_data, "BCL2 Cluster")
if (!is.null(res)) results <- rbind(results, res)

# Combined GCB-derived (SGK1 + BCL2)
gcb_derived <- data[(data$cluster_ICL == "SGK1" | data$cluster_ICL == "BCL2") & !is.na(data$OS_MONTHS), ]
res <- analyze_subset(gcb_derived, "GCB-derived (SGK1+BCL2)")
if (!is.null(res)) results <- rbind(results, res)

# Global for comparison
global_data <- data[!is.na(data$OS_MONTHS), ]
res <- analyze_subset(global_data, "GLOBAL (all)")
if (!is.null(res)) results <- rbind(results, res)

cat("\n\n=============================================================================\n")
cat("SUMMARY TABLE\n")
cat("=============================================================================\n\n")

print(results, row.names = FALSE)

write.csv(results, "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Lacy_HMRN/results/gna13_subset_os_summary.csv", row.names = FALSE)
cat("\nSaved to: Lacy_HMRN/results/gna13_subset_os_summary.csv\n")
