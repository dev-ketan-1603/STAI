export const EDUCATION_LEVELS = [
  { value: "middle_school", label: "Middle School (Class 6-8)" },
  { value: "secondary", label: "Secondary (Class 9-10)" },
  { value: "senior_secondary", label: "Senior Secondary (Class 11-12)" },
  { value: "diploma", label: "Diploma / Polytechnic" },
  { value: "undergraduate", label: "Undergraduate (Bachelor's)" },
  { value: "postgraduate", label: "Postgraduate (Master's)" },
  { value: "doctorate", label: "Doctorate / Research (PhD)" },
  { value: "professional", label: "Professional Course (CA / CS / CMA etc.)" },
  { value: "exam_prep", label: "Competitive Exam Preparation" }
];

export const COURSES_BY_LEVEL = {
  middle_school: ["CBSE", "ICSE", "State Board", "IB", "Cambridge (IGCSE)"],
  secondary: ["CBSE", "ICSE", "State Board", "IB", "Cambridge (IGCSE)"],
  senior_secondary: [
    "Science (PCM)",
    "Science (PCB)",
    "Science (PCMB)",
    "Commerce (with Maths)",
    "Commerce (without Maths)",
    "Arts / Humanities",
    "Vocational"
  ],
  diploma: [
    "Diploma in Computer Engineering",
    "Diploma in Mechanical Engineering",
    "Diploma in Civil Engineering",
    "Diploma in Electrical Engineering",
    "Diploma in Electronics & Communication",
    "D.Pharm",
    "Diploma in Hotel Management",
    "Diploma in Design"
  ],
  undergraduate: [
    "B.Tech / B.E.",
    "B.Sc",
    "B.Com",
    "B.A.",
    "BBA",
    "BCA",
    "B.Pharm",
    "B.Arch",
    "B.Des",
    "MBBS",
    "BDS",
    "LLB / BA LLB / BBA LLB",
    "B.Ed",
    "B.Sc Nursing"
  ],
  postgraduate: [
    "M.Tech / M.E.",
    "M.Sc",
    "M.Com",
    "M.A.",
    "MBA / PGDM",
    "MCA",
    "M.Pharm",
    "LLM",
    "MD / MS",
    "M.Ed",
    "M.Des"
  ],
  doctorate: ["PhD", "M.Phil", "Post-Doctoral"],
  professional: [
    "CA (Chartered Accountancy)",
    "CS (Company Secretary)",
    "CMA (Cost & Management Accountancy)",
    "ACCA",
    "CFA",
    "FRM"
  ],
  exam_prep: [
    "JEE (Main / Advanced)",
    "NEET",
    "CUET",
    "GATE",
    "CAT / MBA Entrance",
    "UPSC / Civil Services",
    "SSC",
    "Banking (IBPS / SBI)",
    "CLAT / Law Entrance",
    "GRE / GMAT / IELTS"
  ]
};

export const TERMS_BY_LEVEL = {
  middle_school: { type: "class", label: "Class / Grade", options: ["Class 6", "Class 7", "Class 8"] },
  secondary: { type: "class", label: "Class / Grade", options: ["Class 9", "Class 10"] },
  senior_secondary: { type: "class", label: "Class / Grade", options: ["Class 11", "Class 12", "Dropper / Repeater"] },
  diploma: {
    type: "semester",
    label: "Semester",
    options: ["1st Sem", "2nd Sem", "3rd Sem", "4th Sem", "5th Sem", "6th Sem"]
  },
  undergraduate: {
    type: "semester",
    label: "Semester",
    options: [
      "1st Sem", "2nd Sem", "3rd Sem", "4th Sem", "5th Sem",
      "6th Sem", "7th Sem", "8th Sem", "9th Sem", "10th Sem"
    ]
  },
  postgraduate: {
    type: "semester",
    label: "Semester",
    options: ["1st Sem", "2nd Sem", "3rd Sem", "4th Sem"]
  },
  doctorate: {
    type: "year",
    label: "Year",
    options: ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year+"]
  },
  professional: {
    type: "stage",
    label: "Stage / Level",
    options: ["Foundation", "Intermediate", "Final", "Articleship / Training"]
  },
  exam_prep: {
    type: "stage",
    label: "Preparation Phase",
    options: ["Just Starting", "Mid Preparation", "Revision Phase", "Repeat Attempt"]
  }
};

export const SPECIALIZATIONS_BY_COURSE = {
  "Science (PCM)": ["Physics", "Chemistry", "Mathematics", "Computer Science", "Informatics Practices"],
  "Science (PCB)": ["Physics", "Chemistry", "Biology", "Biotechnology", "Physical Education"],
  "Commerce (with Maths)": ["Accountancy", "Business Studies", "Economics", "Mathematics"],
  "Arts / Humanities": ["History", "Political Science", "Geography", "Psychology", "Sociology", "Economics"],

  "B.Tech / B.E.": [
    "Computer Science & Engineering",
    "AI / ML",
    "Data Science",
    "Cybersecurity",
    "Information Technology",
    "Electronics & Communication",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Chemical Engineering",
    "Biotechnology",
    "Aerospace Engineering",
    "Robotics & Automation"
  ],
  "B.Sc": [
    "Physics", "Chemistry", "Mathematics", "Computer Science", "Statistics",
    "Biotechnology", "Microbiology", "Zoology", "Botany", "Data Science", "Environmental Science"
  ],
  "B.Com": [
    "Accounting & Finance", "Taxation", "Banking & Insurance", "Economics", "Corporate Secretaryship"
  ],
  "B.A.": [
    "English", "Economics", "Political Science", "History", "Psychology",
    "Sociology", "Journalism & Mass Communication", "Philosophy"
  ],
  "BBA": ["Finance", "Marketing", "Human Resources", "Business Analytics", "International Business", "Entrepreneurship"],
  "BCA": ["AI / ML", "Data Science", "Cloud Computing", "Cybersecurity", "Full Stack Development", "Mobile App Development"],
  "B.Pharm": ["Pharmaceutics", "Pharmacology", "Pharmaceutical Chemistry", "Pharmacognosy", "Quality Assurance"],
  "MBBS": ["General Medicine (Integrated)"],
  "LLB / BA LLB / BBA LLB": ["Corporate Law", "Criminal Law", "Constitutional Law", "IPR", "International Law"],

  "M.Tech / M.E.": [
    "Computer Science", "AI / ML", "Data Science", "VLSI Design",
    "Structural Engineering", "Thermal Engineering", "Power Systems", "Cybersecurity"
  ],
  "M.Sc": ["Physics", "Chemistry", "Mathematics", "Computer Science", "Data Science", "Biotechnology", "Statistics"],
  "M.Com": ["Accounting", "Finance", "Taxation", "Banking"],
  "M.A.": ["English", "Economics", "Political Science", "History", "Psychology", "Sociology"],
  "MBA / PGDM": [
    "Finance", "Marketing", "Human Resources", "Operations", "Business Analytics",
    "International Business", "Entrepreneurship", "Healthcare Management"
  ],
  "MCA": ["AI / ML", "Data Science", "Cloud Computing", "Cybersecurity", "Software Engineering"],
  "M.Pharm": ["Pharmaceutics", "Pharmacology", "Pharmaceutical Chemistry", "Pharmaceutical Analysis"],
  "MD / MS": [
    "General Medicine", "Pediatrics", "Radiology", "Orthopedics",
    "Surgery", "Gynecology", "Dermatology", "Psychiatry"
  ],

  "CA (Chartered Accountancy)": ["Audit & Assurance", "Taxation", "Financial Reporting", "Corporate Law"],
  "PhD": ["Engineering", "Science", "Management", "Humanities & Social Sciences", "Medical Sciences"]
};

export const INSTITUTION_EXAMPLES = [
  "IIT Delhi", "IIT Bombay", "IIT Madras", "IIT Kanpur", "IIT Kharagpur",
  "NIT Trichy", "NIT Warangal", "BITS Pilani", "IIIT Hyderabad", "VIT Vellore",
  "Delhi University", "Jawaharlal Nehru University", "Lovely Professional University",
  "Chandigarh University", "Amity University", "SRM Institute of Science and Technology",
  "Manipal Academy of Higher Education", "Panjab University", "Anna University",
  "DPS School", "Kendriya Vidyalaya", "Modern School", "St. Xavier's School"
];

/**
 * Resolve level object or key from either value (e.g. 'undergraduate') or label ('Undergraduate (Bachelor\'s)')
 */
export function findLevel(levelStr) {
  if (!levelStr) return null;
  const clean = String(levelStr).trim().toLowerCase();
  return EDUCATION_LEVELS.find(l => l.value.toLowerCase() === clean || l.label.toLowerCase() === clean) || null;
}
