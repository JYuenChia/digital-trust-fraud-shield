import pandas as pd
import numpy as np

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
# Remove columns that the AI can't read (text names)
# We also drop 'isFraud' from X (features) and keep it in y (label)
X = df.drop(['isFraud', 'nameOrig', 'nameDest', 'step'], axis=1)
y = df['isFraud']

# Convert 'type' (TRANSFER/CASH_OUT) into numbers the AI understands
X = pd.get_dummies(X, columns=['type'], drop_first=False)

# Clean numerical issues after ratio features.
X = X.replace([np.inf, -np.inf], 0).fillna(0)

print("Step 2 complete! Features engineered and ready for training.")
print(f"Features created: {list(X.columns)}")

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.calibration import CalibratedClassifierCV
from imblearn.over_sampling import SMOTE
import joblib

# 1. Train/Test Split
print("Splitting data...")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# 2. SMOTE (Handling Imbalanced Class)
# To save time and RAM, we sample the data
print("Applying SMOTE to balance the classes... (This takes a moment)")
sm = SMOTE(sampling_strategy=0.1, random_state=42) # Adjusting to 10% fraud for balance
X_train_res, y_train_res = sm.fit_resample(X_train, y_train)

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
print(classification_report(y_test, y_pred))

# 5. Save the "Brain"
# This .pkl file is what your FastAPI will use tomorrow!
joblib.dump(model, 'fraud_model.pkl')
joblib.dump(list(X.columns), 'model_columns.pkl') # Save columns to ensure API matches
print("\nSuccess! Calibrated model saved as 'fraud_model.pkl'")