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
    age: 42,
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
    notes: "Patient is managing diabetes well with current medication and lifestyle changes. Continue current treatment plan."
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
    notes: "Patient reports improved anxiety symptoms with current medication. Continue monitoring for migraine frequency and intensity."
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
    notes: "Patient is adherent to medication. Continue current treatment plan. Next mammogram scheduled for August 2025."
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
    notes: "Patient has been compliant with cardiac rehabilitation program. Continues CPAP therapy nightly. Emphasize importance of medication adherence and regular exercise."
  }
};

module.exports = patientDatabase; 