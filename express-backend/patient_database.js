/**
 * Patient Database
 * 
 * This file contains medical histories and information for each patient.
 * This information will be displayed when a patient is identified through facial recognition.
 */

const patientDatabase = {
  // Patient ID 1
  "1": {
    patient_id: "298jx",
    full_name: "Suleiman Mahmood",
    age: 20,
    gender: "Male",
    blood_type: "A+",
    allergies: ["Penicillin", "Sulfa drugs"],
    current_medications: [
      { name: "Lisinopril", dosage: "10mg", frequency: "Once daily" },
      { name: "Metformin", dosage: "500mg", frequency: "Twice daily" }
    ],
    medical_conditions: [
      "Type 2 Diabetes (diagnosed 2018)",
      "Hypertension",
      "Hyperlipidemia"
    ],
    recent_visits: [
      { date: "2025-02-15", reason: "Quarterly diabetes check-up", doctor: "Dr. Chen" },
      { date: "2024-12-03", reason: "Flu symptoms", doctor: "Dr. Patel" },
      { date: "2024-10-22", reason: "Annual physical", doctor: "Dr. Chen" }
    ],
    lab_results: [
      { date: "2025-02-15", test: "HbA1c", result: "7.1%", notes: "Improved from previous 7.8%" },
      { date: "2025-02-15", test: "Cholesterol Panel", result: "Total: 185 mg/dL", notes: "Within target range" },
      { date: "2024-10-22", test: "Comprehensive Metabolic Panel", result: "Normal", notes: "All values within range" }
    ],
    notes: "Patient is managing diabetes well with current medication and lifestyle changes. Continue current treatment plan.",
    current_complaint: {
      description: "Persistent numbness and tingling in feet for the past 2 weeks",
      duration: "2 weeks",
      severity: "Moderate",
      associated_symptoms: ["Occasional burning sensation", "Worse at night"]
    },
    differential_diagnoses: [
      {
        condition: "Diabetic Peripheral Neuropathy",
        probability: "High",
        specialization: "Endocrinology",
        notes: "Most likely given patient's diabetes history and symptom presentation"
      },
      {
        condition: "Vitamin B12 Deficiency",
        probability: "Medium",
        specialization: "Hematology/Nutrition",
        notes: "Consider testing B12 levels, common in diabetic patients on Metformin"
      },
      {
        condition: "Tarsal Tunnel Syndrome",
        probability: "Low",
        specialization: "Orthopedics/Neurology",
        notes: "Consider if symptoms localized to medial ankle/foot and worsened by activities"
      }
    ],
    interdisciplinary_considerations: [
      "Referral to podiatrist for comprehensive foot examination and preventive care",
      "Consider physical therapy for gait assessment and exercises to improve circulation",
      "Nutritionist consultation to optimize diet for both diabetes and potential nutrient deficiencies"
    ]
  },
  
  // Patient ID 2
  "2": {
    patient_id: "258jx",
    full_name: "Ryan Lin",
    age: 20,
    gender: "Male",
    blood_type: "O-",
    allergies: ["None known"],
    current_medications: [
      { name: "Fluoxetine", dosage: "20mg", frequency: "Once daily" },
      { name: "Loratadine", dosage: "10mg", frequency: "As needed for allergies" }
    ],
    medical_conditions: [
      "Generalized Anxiety Disorder",
      "Seasonal Allergies",
      "Migraines (with aura)"
    ],
    recent_visits: [
      { date: "2025-03-01", reason: "Medication review", doctor: "Dr. Williams" },
      { date: "2024-11-14", reason: "Migraine episode", doctor: "Dr. Jackson" },
      { date: "2024-09-05", reason: "Annual physical", doctor: "Dr. Williams" }
    ],
    lab_results: [
      { date: "2025-03-01", test: "Liver Function Test", result: "Normal", notes: "Monitoring for medication effects" },
      { date: "2024-09-05", test: "Thyroid Panel", result: "Normal", notes: "TSH: 2.1 mIU/L" },
      { date: "2024-09-05", test: "CBC", result: "Normal", notes: "All values within reference range" }
    ],
    notes: "Patient reports improved anxiety symptoms with current medication. Continue monitoring for migraine frequency and intensity.",
    current_complaint: {
      description: "Increasing frequency of migraines, now 3-4 times per week",
      duration: "Past month",
      severity: "Severe",
      associated_symptoms: ["Visual aura", "Nausea", "Light sensitivity", "Sleep disturbances"]
    },
    differential_diagnoses: [
      {
        condition: "Medication-Induced Headache",
        probability: "High",
        specialization: "Neurology/Psychopharmacology",
        notes: "Consider if Fluoxetine may be contributing to increased migraine frequency"
      },
      {
        condition: "Chronic Migraine",
        probability: "High",
        specialization: "Neurology",
        notes: "Progression from episodic to chronic pattern"
      },
      {
        condition: "Sleep Apnea",
        probability: "Medium",
        specialization: "Sleep Medicine",
        notes: "Sleep disturbances might indicate underlying sleep disorder contributing to migraines"
      },
      {
        condition: "Intracranial Hypertension",
        probability: "Low",
        specialization: "Neurology/Ophthalmology",
        notes: "Consider if symptoms persist despite treatment optimization"
      }
    ],
    interdisciplinary_considerations: [
      "Neurology referral for specialized migraine management",
      "Sleep study to rule out sleep disorders exacerbating migraines",
      "Consider cognitive behavioral therapy for pain management alongside pharmacological treatment",
      "Ophthalmology consultation to evaluate for papilledema and visual disturbances"
    ]
  },
  
  // Patient ID 3
  "3": {
    patient_id: "387jx",
    full_name: "Azka Adziman",
    age: 20,
    gender: "Male",
    blood_type: "B+",
    allergies: ["Latex", "Iodine contrast"],
    current_medications: [
      { name: "Levothyroxine", dosage: "75mcg", frequency: "Once daily" },
      { name: "Alendronate", dosage: "70mg", frequency: "Once weekly" },
      { name: "Vitamin D", dosage: "2000 IU", frequency: "Once daily" },
      { name: "Calcium", dosage: "600mg", frequency: "Twice daily" }
    ],
    medical_conditions: [
      "Hypothyroidism",
      "Osteoporosis",
      "History of breast cancer (remission since 2020)",
      "Hypertension"
    ],
    recent_visits: [
      { date: "2025-01-20", reason: "Bone density scan", doctor: "Dr. Garcia" },
      { date: "2024-11-30", reason: "Thyroid function check", doctor: "Dr. Miller" },
      { date: "2024-08-15", reason: "Annual mammogram", doctor: "Dr. Garcia" }
    ],
    lab_results: [
      { date: "2024-11-30", test: "TSH", result: "3.2 mIU/L", notes: "Within normal range" },
      { date: "2024-11-30", test: "T4", result: "1.1 ng/dL", notes: "Normal" },
      { date: "2025-01-20", test: "Bone Density", result: "T-score: -2.3", notes: "Slight improvement from previous scan" }
    ],
    notes: "Patient is adherent to medication. Continue current treatment plan. Next mammogram scheduled for August 2025.",
    current_complaint: {
      description: "Persistent dry cough and fatigue for 3 weeks",
      duration: "3 weeks",
      severity: "Moderate",
      associated_symptoms: ["Slight shortness of breath on exertion", "No fever", "Occasional chest discomfort"]
    },
    differential_diagnoses: [
      {
        condition: "Medication-induced Cough (ACE inhibitor)",
        probability: "Medium",
        specialization: "Cardiology/Pharmacology",
        notes: "Check if patient is on ACE inhibitor for hypertension"
      },
      {
        condition: "Post-radiation Pneumonitis",
        probability: "Medium",
        specialization: "Oncology/Pulmonology",
        notes: "Consider if patient received chest radiation during breast cancer treatment"
      },
      {
        condition: "Interstitial Lung Disease",
        probability: "Low",
        specialization: "Pulmonology/Rheumatology",
        notes: "Can be associated with hypothyroidism or as a late effect of certain cancer therapies"
      },
      {
        condition: "Cardiac-related Cough/Heart Failure",
        probability: "Low",
        specialization: "Cardiology",
        notes: "Consider given history of hypertension and chest discomfort"
      }
    ],
    interdisciplinary_considerations: [
      "Pulmonary function tests to establish baseline and assess for restrictive patterns",
      "Cardiology assessment including echocardiogram to evaluate cardiac function",
      "Oncology review to consider any relation to previous cancer treatment",
      "Medication review with pharmacist to identify potential iatrogenic causes"
    ]
  },
  
  // Patient ID 4
  "4": {
    patient_id: "412jx",
    full_name: "James Wilson",
    age: 52,
    gender: "Male",
    blood_type: "AB+",
    allergies: ["Aspirin", "Shellfish"],
    current_medications: [
      { name: "Atorvastatin", dosage: "40mg", frequency: "Once daily" },
      { name: "Clopidogrel", dosage: "75mg", frequency: "Once daily" },
      { name: "Metoprolol", dosage: "50mg", frequency: "Twice daily" }
    ],
    medical_conditions: [
      "Coronary Artery Disease",
      "Myocardial Infarction (2023)",
      "Hyperlipidemia",
      "Obstructive Sleep Apnea"
    ],
    recent_visits: [
      { date: "2025-02-28", reason: "Cardiac checkup", doctor: "Dr. Lee" },
      { date: "2025-01-05", reason: "Sleep study follow-up", doctor: "Dr. Brown" },
      { date: "2024-12-15", reason: "Medication review", doctor: "Dr. Lee" }
    ],
    lab_results: [
      { date: "2025-02-28", test: "Lipid Panel", result: "LDL: 85 mg/dL", notes: "Within target range" },
      { date: "2025-02-28", test: "Troponin", result: "Negative", notes: "No evidence of cardiac damage" },
      { date: "2025-02-28", test: "CRP", result: "2.4 mg/L", notes: "Slightly elevated, monitor" }
    ],
    notes: "Patient has been compliant with cardiac rehabilitation program. Continues CPAP therapy nightly. Emphasize importance of medication adherence and regular exercise.",
    current_complaint: {
      description: "New onset joint pain in hands and wrists, morning stiffness",
      duration: "6 weeks",
      severity: "Moderate to severe",
      associated_symptoms: ["Bilateral symmetrical involvement", "Morning stiffness lasting >1 hour", "Fatigue"]
    },
    differential_diagnoses: [
      {
        condition: "Rheumatoid Arthritis",
        probability: "High",
        specialization: "Rheumatology",
        notes: "Symmetrical joint involvement and morning stiffness highly suggestive"
      },
      {
        condition: "Statin-induced Myopathy",
        probability: "Medium",
        specialization: "Pharmacology/Lipidology",
        notes: "Consider atorvastatin as potential cause, though joint rather than muscle symptoms unusual"
      },
      {
        condition: "Inflammatory Arthritis Secondary to CAD",
        probability: "Medium",
        specialization: "Cardiology/Rheumatology",
        notes: "Inflammatory conditions can be associated with coronary artery disease"
      },
      {
        condition: "Paraneoplastic Syndrome",
        probability: "Low",
        specialization: "Oncology",
        notes: "New onset inflammatory arthritis in older adult should prompt age-appropriate cancer screening"
      }
    ],
    interdisciplinary_considerations: [
      "Rheumatology referral for specialized evaluation and management",
      "Consider rheumatoid factor, anti-CCP antibodies, and inflammatory markers",
      "Evaluate cardiovascular risk with added inflammatory condition",
      "Occupational therapy assessment for joint protection and adaptive strategies",
      "Review all medications with clinical pharmacist for potential interactions if new treatments initiated"
    ]
  }
};

module.exports = patientDatabase; 