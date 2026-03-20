import pandas as pd
import numpy as np
import os
import matplotlib.pyplot as plt

# 1. Load the filtered data we just created
print("Loading filtered data...")
df = pd.read_csv('data/filtered_paysim.csv')

# 2. Behavioral Profiling Logic
print("Engineering features...")

# Feature A: Error in Balance (Logic: Transaction + New != Old)
# In fraud, often the money is moved but the math doesn't 'add up' naturally
df['errorBalanceOrig'] = df['newbalanceOrig'] + df['amount'] - df['oldbalanceOrg']
df['errorBalanceDest'] = df['oldbalanceDest'] + df['amount'] - df['newbalanceDest']

# Feature B: Merchant Check (Case study mentions rural merchants)
# PaySim destinations starting with 'M' are merchants. 
df['isMerchantDest'] = df['nameDest'].str.startswith('M').astype(int)

# Feature C: "Emptying Account" indicator
# Common in fraud: the balance becomes exactly 0 after the transaction
df['isEmptyingAccount'] = (df['newbalanceOrig'] == 0).astype(int)

# Feature D: Hour-of-day from step (1 step = 1 hour in this dataset)
df['hourOfDay'] = df['step'] % 24

# Feature E: Day index (coarse time progression)
df['dayIndex'] = (df['step'] // 24).astype(int)

# Feature F: Amount-to-balance ratio (behavioral intensity)
df['amountToOldBalanceRatio'] = np.where(
	df['oldbalanceOrg'] > 0,
	df['amount'] / df['oldbalanceOrg'],
	0.0,
)

# Feature G: Explicit balance deltas to capture movement consistency
df['origBalanceDelta'] = df['oldbalanceOrg'] - df['newbalanceOrig']
df['destBalanceDelta'] = df['newbalanceDest'] - df['oldbalanceDest']

# 3. Clean up for the AI
# Remove columns that the AI can't read (text names).
# IMPORTANT: Drop isFlaggedFraud to avoid label leakage and unrealistically perfect scores.
X = df.drop(['isFraud', 'isFlaggedFraud', 'nameOrig', 'nameDest', 'step'], axis=1)
y = df['isFraud']

# Convert 'type' (TRANSFER/CASH_OUT) into numbers the AI understands
X = pd.get_dummies(X, columns=['type'], drop_first=False)

# Clean numerical issues after ratio features.
X = X.replace([np.inf, -np.inf], 0).fillna(0)

print("Step 2 complete! Features engineered and ready for training.")
print(f"Features created: {list(X.columns)}")

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
	classification_report,
	confusion_matrix,
	roc_curve,
	auc,
	precision_recall_curve,
	average_precision_score,
	roc_auc_score,
	brier_score_loss,
	log_loss,
	precision_score,
	recall_score,
	f1_score,
)
from sklearn.calibration import CalibratedClassifierCV
from imblearn.over_sampling import SMOTE
import joblib

# 1. Train/Test Split (time-based for realistic generalization)
print("Splitting data with time-based holdout...")
day_cutoff = int(df['dayIndex'].quantile(0.8))
train_mask = df['dayIndex'] <= day_cutoff
test_mask = df['dayIndex'] > day_cutoff

X_train = X.loc[train_mask]
X_test = X.loc[test_mask]
y_train = y.loc[train_mask]
y_test = y.loc[test_mask]

# Fallback in case time split yields single-class partition on a sampled dataset.
if y_train.nunique() < 2 or y_test.nunique() < 2:
	print("Warning: time split produced single-class partition. Falling back to stratified random split.")
	X_train, X_test, y_train, y_test = train_test_split(
		X, y, test_size=0.2, random_state=42, stratify=y
	)

print(f"Train samples: {len(X_train):,} | Test samples: {len(X_test):,}")
print(f"Train fraud rate: {y_train.mean():.4%} | Test fraud rate: {y_test.mean():.4%}")

# 2. SMOTE (Handling Imbalanced Class)
# To save time and RAM, we sample the data
print("Applying SMOTE to balance the classes... (This takes a moment)")
sm = SMOTE(sampling_strategy=0.1, random_state=42) # Adjusting to 10% fraud for balance
try:
	X_train_res, y_train_res = sm.fit_resample(X_train, y_train)
except ValueError:
	print("Warning: SMOTE could not be applied on this split. Continuing with original training data.")
	X_train_res, y_train_res = X_train, y_train

# 3. Model Training (Random Forest)
print("Training the Fraud Shield model (Random Forest)...")
# We use n_estimators=50 to keep it fast for the hackathon
base_model = RandomForestClassifier(n_estimators=50, max_depth=10, n_jobs=-1, random_state=42)

# Calibrate probabilities so model_score reflects confidence more realistically.
# Sigmoid is robust on imbalanced data and cheaper than isotonic.
model = CalibratedClassifierCV(base_model, method='sigmoid', cv=3)
model.fit(X_train_res, y_train_res)

# 4. Evaluation
print("\n--- Model Performance ---")
y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)[:, 1]
print(classification_report(y_test, y_pred, digits=6))

cm = confusion_matrix(y_test, y_pred)
tn, fp, fn, tp = cm.ravel()
print("Detailed confusion matrix counts:")
print(f"TN={tn:,}  FP={fp:,}  FN={fn:,}  TP={tp:,}")

roc_auc_value = roc_auc_score(y_test, y_prob)
ap_value = average_precision_score(y_test, y_prob)
brier = brier_score_loss(y_test, y_prob)
ll = log_loss(y_test, np.clip(y_prob, 1e-12, 1 - 1e-12))

print("Probability-quality metrics:")
print(f"ROC-AUC: {roc_auc_value:.6f}")
print(f"PR-AUC (Average Precision): {ap_value:.6f}")
print(f"Brier Score: {brier:.8f}")
print(f"Log Loss: {ll:.8f}")

# Report practical operating-point metrics instead of only default threshold 0.50.
for threshold in [0.30, 0.50, 0.70, 0.90]:
	y_pred_t = (y_prob >= threshold).astype(int)
	p = precision_score(y_test, y_pred_t, zero_division=0)
	r = recall_score(y_test, y_pred_t, zero_division=0)
	f1 = f1_score(y_test, y_pred_t, zero_division=0)
	print(f"Threshold {threshold:.2f} -> Precision: {p:.6f}, Recall: {r:.6f}, F1: {f1:.6f}")

# 5. Generate documentation-ready model graphs
print("Generating model graphs for documentation...")
plot_dir = os.path.join('ml', 'models', 'plots')
os.makedirs(plot_dir, exist_ok=True)

# Confusion matrix plot
fig, ax = plt.subplots(figsize=(6, 5))
im = ax.imshow(cm, cmap='Oranges')
ax.figure.colorbar(im, ax=ax)
ax.set_title('Confusion Matrix')
ax.set_xlabel('Predicted Label')
ax.set_ylabel('True Label')
ax.set_xticks([0, 1])
ax.set_yticks([0, 1])
ax.set_xticklabels(['Legit', 'Fraud'])
ax.set_yticklabels(['Legit', 'Fraud'])
for i in range(cm.shape[0]):
	for j in range(cm.shape[1]):
		ax.text(j, i, f"{cm[i, j]}", ha='center', va='center', color='black', fontsize=11)
fig.tight_layout()
fig.savefig(os.path.join(plot_dir, 'confusion_matrix.png'), dpi=200)
plt.close(fig)

# ROC curve plot
fpr, tpr, _ = roc_curve(y_test, y_prob)
roc_auc = auc(fpr, tpr)
fig, ax = plt.subplots(figsize=(6, 5))
ax.plot(fpr, tpr, color='#FF5500', linewidth=2, label=f'ROC AUC = {roc_auc:.3f}')
ax.plot([0, 1], [0, 1], color='#8A8A8A', linestyle='--', linewidth=1)
ax.set_title('ROC Curve')
ax.set_xlabel('False Positive Rate')
ax.set_ylabel('True Positive Rate')
ax.legend(loc='lower right')
ax.grid(alpha=0.25)
fig.tight_layout()
fig.savefig(os.path.join(plot_dir, 'roc_curve.png'), dpi=200)
plt.close(fig)

# Precision-Recall curve plot
precision, recall, _ = precision_recall_curve(y_test, y_prob)
ap = average_precision_score(y_test, y_prob)
fig, ax = plt.subplots(figsize=(6, 5))
ax.plot(recall, precision, color='#2F83C9', linewidth=2, label=f'AP = {ap:.3f}')
ax.set_title('Precision-Recall Curve')
ax.set_xlabel('Recall')
ax.set_ylabel('Precision')
ax.legend(loc='lower left')
ax.grid(alpha=0.25)
fig.tight_layout()
fig.savefig(os.path.join(plot_dir, 'precision_recall_curve.png'), dpi=200)
plt.close(fig)

# Predicted probability distribution plot
fig, ax = plt.subplots(figsize=(7, 5))
ax.hist(y_prob[y_test == 0], bins=40, alpha=0.65, label='Legit', color='#32D74B')
ax.hist(y_prob[y_test == 1], bins=40, alpha=0.65, label='Fraud', color='#FF3B30')
ax.set_yscale('log')
ax.set_title('Fraud Probability Distribution (Logarithmic Scale)')
ax.set_xlabel('Model Predicted Probability')
ax.set_ylabel('Count (Log Scale)')
ax.legend()
ax.grid(True, which='both', linestyle='-', alpha=0.2)
fig.tight_layout()
fig.savefig(os.path.join(plot_dir, 'score_distribution.png'), dpi=200)
plt.close(fig)

print(f"Graphs saved to: {plot_dir}")

# 6. Save the "Brain"
# This .pkl file is what your FastAPI will use tomorrow!
joblib.dump(model, 'fraud_model.pkl')
joblib.dump(list(X.columns), 'model_columns.pkl') # Save columns to ensure API matches
print("\nSuccess! Calibrated model saved as 'fraud_model.pkl'")