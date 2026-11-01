"""Authoritative metadata and PDF mappings for all verified welfare schemes."""

SCHEMES_EXTRA_METADATA = {
    "SCHEME-PM-KISAN": {
        "objectives": "To augment the income of landholding farmers to enable them to take care of expenses related to agriculture and allied activities as well as domestic needs.",
        "beneficiaries": "All landholding farmer families who own cultivable land as per the land records of the concerned State/UT, subject to exclusion criteria.",
        "eligibility_criteria": "Farmer family (husband, wife, and minor children) owning cultivable land in rural or urban areas. Land records must be validated. Mandatory Aadhaar and e-KYC authentication required.",
        "age_criteria": "18 years and above (adult head of landholding family).",
        "income_criteria": "No land size limit (covers small, marginal, and large farmers), but subject to professional/taxpayer exclusion rules.",
        "required_documents": [
            "Aadhaar Card",
            "Land ownership papers / Khatauni / Khasra records",
            "Active bank account passbook linked to Aadhaar",
            "Mobile number registered with Aadhaar for e-KYC"
        ],
        "application_process": "Farmers can register online via 'Farmer Corner' on pmkisan.gov.in, through the PMKISAN Mobile App with Face Authentication, or at the nearest Common Service Centre (CSC) or State Nodal Agriculture Office.",
        "application_mode": "Online (Portal & Mobile App) / Offline (CSC & State Agriculture Department)",
        "exclusions": "Institutional landholders; Former and present holders of constitutional posts; Former/present Ministers, MPs, MLAs, MLCs, Mayors, District Panchayat Chairpersons; Serving/retired officers and employees of Central/State Govt and PSEs (excluding MTS/Class IV/Group D); Pensioners receiving Rs. 10,000+ monthly pension; Income Tax payers in the last assessment year; Professionals like Doctors, Engineers, Lawyers, Chartered Accountants, and Architects.",
        "relevant_pages": [1, 2, 3, 4, 5, 8],
        "guideline_title": "PM-KISAN Operational Guidelines (Revised)",
        "pdf_filename": "RevisedPM-KISANOperationalGuidelines(English).pdf"
    },
    "SCHEME-PM-JAY": {
        "objectives": "To reduce catastrophic out-of-pocket healthcare expenditures and ensure accessible, quality inpatient treatment for poor and vulnerable households.",
        "beneficiaries": "Bottom 40% of India's population based on SECC 2011 deprivation criteria in rural areas and occupational criteria in urban areas, expanded to all senior citizens aged 70+.",
        "eligibility_criteria": "Identified families listed in SECC 2011 database, Rashtriya Swasthya Bima Yojana (RSBY) active beneficiaries, and all senior citizens aged 70 years and above irrespective of economic status.",
        "age_criteria": "No age restriction. Special top-up cover available for all senior citizens aged 70 and above.",
        "income_criteria": "Defined by SECC 2011 deprivation criteria (D1 to D7 in rural; 11 occupational categories in urban).",
        "required_documents": [
            "Aadhaar Card",
            "Ration Card / PM-JAY Family ID",
            "Ayushman Golden Card (generated at hospital or CSC)"
        ],
        "application_process": "Eligible citizens can check status online at beneficiary.nha.gov.in, visit any Empaneled Health Care Provider (EHCP) Ayushman Mitra kiosk, or visit a Common Service Centre (CSC) for e-KYC and Ayushman Card issuance.",
        "application_mode": "Online Self-Registration / Hospital Ayushman Mitra Kiosk / CSC",
        "exclusions": "Households possessing motorized 3/4 wheelers, mechanized agricultural equipment, Kisan credit card with limit of Rs. 50,000+, government employees, or owning pucca houses with more than 3 rooms (as per SECC urban exclusion parameters).",
        "relevant_pages": [1, 2, 3],
        "guideline_title": "Ayushman Bharat PM-JAY Operational Guidelines",
        "pdf_filename": "PMJAY.pdf"
    },
    "SCHEME-PMAY-U": {
        "objectives": "To ensure every eligible urban poor household has access to a permanent pucca house with water, sanitation, and electricity connections.",
        "beneficiaries": "Urban poor living in slums and non-slum areas, Economically Weaker Section (EWS) families, and Low-Income Groups (LIG).",
        "eligibility_criteria": "The beneficiary family must not own a pucca house in their name or in the name of any family member anywhere in India. The family must comprise husband, wife, and unmarried children.",
        "age_criteria": "Adult applicant (18 years and above). Ownership must be in the name of the female head or joint ownership with spouse.",
        "income_criteria": "EWS household annual income up to Rs. 3,00,000; LIG household annual income between Rs. 3,00,001 and Rs. 6,00,000.",
        "required_documents": [
            "Aadhaar Card of all family members",
            "Proof of family income / EWS certificate",
            "Land ownership documents or patta for BLC vertical",
            "Bank account passbook with IFSC code",
            "Self-affidavit confirming no pucca house ownership in India"
        ],
        "application_process": "Eligible citizens can apply through their Urban Local Body (ULB) / Municipality, via Common Service Centres (CSCs), or online at pmaymis.gov.in under Citizen Assessment.",
        "application_mode": "Online via PMAY-MIS Portal / Municipal Corporation Office / CSC",
        "exclusions": "Families already owning a pucca house anywhere in India, families that have availed central assistance under any prior housing scheme of Government of India.",
        "relevant_pages": [1, 2, 8, 12, 18, 22],
        "guideline_title": "Pradhan Mantri Awas Yojana (Urban) Scheme Guidelines",
        "pdf_filename": "Operational_Guidelines_of_PMAY-U (1).pdf"
    },
    "SCHEME-PMAY-G": {
        "objectives": "To provide 'Housing for All' in rural areas by building disaster-resilient pucca houses with cooking space, piped water, power, and toilet.",
        "beneficiaries": "Rural families without shelter or living in zero, one, or two-room houses with kutcha roof and kutcha walls as identified by SECC 2011 and Awaas+ list.",
        "eligibility_criteria": "Houseless rural families, families living in kutcha/damaged houses identified through Gram Sabha verified priority lists. Must not own a pucca house.",
        "age_criteria": "Adult family head (18 years and above). Joint ownership with female spouse prioritized.",
        "income_criteria": "Rural BPL / SECC deprivation status.",
        "required_documents": [
            "Aadhaar number of all family members",
            "MGNREGA Job Card",
            "Bank Account Passbook linked to Aadhaar",
            "Swachh Bharat Mission (SBM) registration number"
        ],
        "application_process": "Selection is conducted transparently through Gram Sabha verification based on SECC 2011 and Awaas+ survey; registration done by Block Development Officer or Panchayat Secretary.",
        "application_mode": "Panchayat Level Awaas+ Enumeration / Gram Sabha Registration",
        "exclusions": "Households possessing motorized two/three/four wheelers, mechanized agricultural equipment, Kisan Credit Card with credit limit of Rs. 50,000 or above, government employees, or paying income tax.",
        "relevant_pages": [3, 4],
        "guideline_title": "Pradhan Mantri Awaas Yojana - Gramin Framework",
        "pdf_filename": "DfG_Analysis_2026-27-Agriculture.pdf"
    },
    "SCHEME-PMUY": {
        "objectives": "To protect the health of women and children from toxic kitchen smoke, empower women, and prevent indoor air pollution by switching from firewood/coal to clean LPG fuel.",
        "beneficiaries": "Adult women belonging to poor households without an existing LPG connection.",
        "eligibility_criteria": "Woman applicant must be aged 18 years or older. No other LPG connection can exist in the same household. Must belong to SC/ST, PMAY-G beneficiary list, Antyodaya Anna Yojana (AAY), Forest dwellers, Most Backward Classes, or declare low-income under the 14-point declaration.",
        "age_criteria": "Minimum 18 years (female applicant only).",
        "income_criteria": "Poor household / BPL / BPL declaration under 14-point criteria.",
        "required_documents": [
            "Aadhaar Card of the applicant as proof of identity and address",
            "Ration card proving family composition",
            "Bank account passbook with IFSC code",
            "Aadhaar numbers of all adult family members"
        ],
        "application_process": "Apply online at pmuy.gov.in or submit the 2-page Ujjwala 2.0 application form directly at the nearest LPG distributor (Indane, Bharatgas, or HP Gas). Migrants can submit self-declaration for address proof.",
        "application_mode": "Online Portal / LPG Distributorship Counters",
        "exclusions": "Households that already possess an active LPG connection in the name of any family member.",
        "relevant_pages": [1, 2, 3, 4, 7],
        "guideline_title": "Pradhan Mantri Ujjwala Yojana 2.0 Operational Guidelines",
        "pdf_filename": "doc202110101.pdf"
    },
    "SCHEME-SSY": {
        "objectives": "To promote the welfare of girl children, encourage parents to build a fund for their higher education and marriage, and secure financial inclusion.",
        "beneficiaries": "Girl children residing in India below the age of 10 years, through their natural or legal guardians.",
        "eligibility_criteria": "Account can be opened by the natural or legal guardian in the name of a girl child from her birth until she attains the age of 10 years. Maximum two accounts per family (exceptions for twins/triplets).",
        "age_criteria": "Girl child must be between 0 and 10 years old at the time of account opening.",
        "income_criteria": "No income restrictions. Open to all Indian families.",
        "required_documents": [
            "Birth certificate of the girl child",
            "Identity and address proof of guardian (Aadhaar Card, PAN Card, Voter ID)",
            "Medical certificate in case of twin/triplet girl births",
            "Passport size photographs"
        ],
        "application_process": "Submit the Sukanya Samriddhi Account Opening Form along with photographs and KYC documents at any India Post Office branch or authorized public/private commercial bank.",
        "application_mode": "Offline at Post Offices and Authorized Banks / Online Banking Portal",
        "exclusions": "Cannot open more than one account per girl child. Maximum 2 accounts per family unless multiple girls born in the first/second order of birth.",
        "relevant_pages": [1, 2, 3, 4, 5],
        "guideline_title": "Sukanya Samriddhi Yojana : A Decade of Transforming Lives",
        "pdf_filename": "doc2025121487401.pdf"
    },
    "SCHEME-CSSS": {
        "objectives": "To incentivize meritorious students from economically backward families to pursue regular degree higher education.",
        "beneficiaries": "Students who scored above the 80th percentile in their relevant stream in Class 12 board examinations and enrolled in regular undergraduate degree courses.",
        "eligibility_criteria": "Scored above the 80th percentile of successful candidates in the relevant stream in Class XII of 10+2 pattern; Pursuing regular degree courses in recognized colleges/universities (not correspondence or diploma); Not availing of any other scholarship or fee waiver.",
        "age_criteria": "Age 18 to 25 years.",
        "income_criteria": "Gross family income should not exceed Rs. 4,50,000 (Four Lakh Fifty Thousand) per annum.",
        "required_documents": [
            "Class 12th Board marksheet",
            "Income certificate issued by competent authority",
            "College/University admission proof and Bonafide certificate",
            "Aadhaar Card",
            "Student's bank passbook"
        ],
        "application_process": "Applications must be submitted online exclusively through the National Scholarship Portal (scholarships.gov.in) with electronic verification by the educational institution and State Nodal Officer.",
        "application_mode": "Online via National Scholarship Portal (NSP)",
        "exclusions": "Students pursuing correspondence, distance education, or diploma courses; Students availing any other Central/State merit scholarship or full fee waiver; Gross parental income exceeding Rs. 4.5 Lakh.",
        "relevant_pages": [1, 2, 3, 4],
        "guideline_title": "PM-USP CSSS Scholarship Guidelines 2024",
        "pdf_filename": "CSSS_GUIDLINES_07022024_updated.pdf"
    },
    "SCHEME-PMS-SC": {
        "objectives": "To substantially increase the Gross Enrolment Ratio of SC students in higher education and reduce dropout rates between matriculation and graduate degrees.",
        "beneficiaries": "Scheduled Caste (SC) students studying in post-matriculation or post-secondary courses across recognized higher education institutions.",
        "eligibility_criteria": "Student must belong to Scheduled Caste category; Must have passed Matriculation/Higher Secondary examination; Enrolled in a recognized institution; Total parental income from all sources must not exceed Rs. 2.50 Lakh per annum.",
        "age_criteria": "Enrolled in recognized post-matric course.",
        "income_criteria": "Total family annual income must not exceed Rs. 2,50,000 per annum.",
        "required_documents": [
            "Valid SC Caste Certificate",
            "Income Certificate from authorized revenue officer",
            "Previous year marksheet",
            "Fee receipt from institution",
            "Aadhaar-seeded bank account details"
        ],
        "application_process": "Students apply through the State Scholarship Portal or the National Scholarship Portal (NSP). The institution verifies the enrollment and fees, followed by State Welfare Department approval and DBT release.",
        "application_mode": "Online via National Scholarship Portal / State Scholarship Portals",
        "exclusions": "Students studying through unaccredited private institutes; Students whose parental income exceeds Rs. 2.5 Lakh per annum; More than two male children from the same family.",
        "relevant_pages": [1, 2, 4, 6, 8, 12],
        "guideline_title": "Centrally Sponsored Scheme of Post-Matric Scholarship for SC Students",
        "pdf_filename": "Postmatric_SC.pdf"
    },
    "SCHEME-NSPG-UGC": {
        "objectives": "To enable meritorious students from economically weaker sections to pursue higher postgraduate studies without financial strain.",
        "beneficiaries": "Meritorious postgraduate students enrolled in the 1st year of full-time regular postgraduate courses in universities and colleges recognized under UGC Acts.",
        "eligibility_criteria": "Student must be an Indian citizen; Enrolled in 1st year of full-time regular PG program in an eligible higher education institution; Maximum age 30 years at admission; Distance or correspondence students NOT eligible.",
        "age_criteria": "Maximum 30 years of age as on the date of admission to the PG course.",
        "income_criteria": "Merit-based slot selection across all university faculties (Arts, Science, Commerce, Engineering, etc.).",
        "required_documents": [
            "Undergraduate final degree marksheet",
            "PG admission fee receipt and Bonafide student certificate",
            "Aadhaar Card",
            "Active bank account passbook"
        ],
        "application_process": "Eligible candidates apply online through the National Scholarship Portal (NSP). Applications are verified online by the respective University Nodal Officer and sanctioned by UGC.",
        "application_mode": "Online via National Scholarship Portal (NSP)",
        "exclusions": "Students enrolled in open, distance, correspondence, or part-time PG programs are strictly ineligible. Students receiving any other UGC, CSIR, or Government scholarship/fellowship are excluded.",
        "relevant_pages": [1, 2, 3, 5, 7],
        "guideline_title": "UGC Guidelines for National Scholarship for Post Graduate Studies",
        "pdf_filename": "Guidelines_NATIONAL_SCHOLARSHIP_FOR_POSTGRADUATE_STUDIES_UGC_2324 (1).pdf"
    },
    "SCHEME-PMFBY": {
        "objectives": "To provide financial stability to farmers during crop failure, encourage progressive farming practices, and ensure continuous credit flow into the agricultural sector.",
        "beneficiaries": "All landholding and tenant farmers cultivating notified crops in notified areas across India.",
        "eligibility_criteria": "Farmers (sharecroppers and tenant farmers included) cultivating insurable crops in areas notified by the State Government. Enrollment is open to both loanee and non-loanee farmers.",
        "age_criteria": "18 years and above (farmer/cultivator).",
        "income_criteria": "No income ceiling. Covers small, marginal, and large agriculturalists.",
        "required_documents": [
            "Land Record (Khasra/Khatauni)",
            "Sowing Certificate / Crop Declaration issued by Patwari/Panchayat",
            "Aadhaar Card",
            "Bank account passbook"
        ],
        "application_process": "Farmers can apply directly on pmfby.gov.in, through the Crop Insurance Mobile App, at Common Service Centres (CSCs), or via rural bank branches before the cutoff date for each crop season.",
        "application_mode": "Online (National Crop Insurance Portal & Mobile App) / Offline (Bank Branches & CSCs)",
        "exclusions": "Losses arising out of war, nuclear risks, malicious damage, or domestic animals grazing are excluded.",
        "relevant_pages": [6, 7, 8],
        "guideline_title": "Demand for Grants Analysis : Agriculture and Farmers Welfare (PMFBY Section)",
        "pdf_filename": "DfG_Analysis_2026-27-Agriculture.pdf"
    },
    "SCHEME-KCC": {
        "objectives": "To protect farmers from the exploitation of non-institutional moneylenders and ensure timely, sufficient credit for agricultural inputs and allied activities.",
        "beneficiaries": "Individual and joint farmers, owner-cultivators, tenant farmers, oral lessees, sharecroppers, and Self-Help Groups (SHGs) of farmers.",
        "eligibility_criteria": "Individuals owning agricultural land or engaged in crop production, dairy, fisheries, poultry, or animal husbandry.",
        "age_criteria": "Minimum 18 years, maximum 75 years (co-borrower mandatory if age > 60).",
        "income_criteria": "Determined by cropped area and scale of finance fixed by District Level Technical Committee (DLTC).",
        "required_documents": [
            "Application Form",
            "Identity and Address proof (Aadhaar / Voter ID)",
            "Land revenue records proving ownership or tenancy agreement",
            "Passport size photograph"
        ],
        "application_process": "Farmers can apply at any Commercial Bank, Regional Rural Bank (RRB), Cooperative Bank branch, or online through the PM-KISAN portal (using existing verified data) or JanSamarth portal.",
        "application_mode": "Online (JanSamarth / PM-KISAN portal) / Offline at Bank Branches",
        "exclusions": "Defaulting borrowers with unregularized NPA accounts in any financial institution.",
        "relevant_pages": [9, 10, 11],
        "guideline_title": "Demand for Grants Analysis : Agriculture and Farmers Welfare (KCC & MISS)",
        "pdf_filename": "DfG_Analysis_2026-27-Agriculture.pdf"
    },
    "SCHEME-NMMSS": {
        "objectives": "To reduce dropout rates of underprivileged students between upper primary and secondary school levels.",
        "beneficiaries": "Students studying as regular students in Government, Local body, and Government-aided schools who clear the State-level selection test.",
        "eligibility_criteria": "Minimum 55% marks or equivalent grade in Class VII examination (5% relaxation for SC/ST); Must qualify the NMMSS State Level Examination (Mental Ability Test & Scholastic Aptitude Test); Annual parental income not exceeding Rs. 3,50,000.",
        "age_criteria": "School students studying in class VIII at the time of examination.",
        "income_criteria": "Parental income from all sources must not exceed Rs. 3,50,000 per annum.",
        "required_documents": [
            "Class VII marksheet",
            "Parental Income Certificate",
            "Caste/Category Certificate (if SC/ST)",
            "Aadhaar Card",
            "Bank passbook in student's name"
        ],
        "application_process": "Students register through their school for the State-level examination. Qualifying students register their profile on the National Scholarship Portal (scholarships.gov.in).",
        "application_mode": "School-level offline examination registration followed by online verification on NSP",
        "exclusions": "Students of Kendriya Vidyalayas, Jawahar Navodaya Vidyalayas, Sainik Schools, and residential schools run by State Governments where board and lodging are provided free are NOT eligible.",
        "relevant_pages": [14, 15],
        "guideline_title": "Centrally Sponsored Schemes Compendium : Department of School Education",
        "pdf_filename": "GoI-CSSchemes-20.05.2025.pdf"
    },
    "SCHEME-UK-NANDA-GAURA": {
        "objectives": "To improve female child sex ratio, ensure institutional delivery, stop child marriages, and promote higher education for rural and poor girls in Uttarakhand.",
        "beneficiaries": "Permanent resident girl children of Uttarakhand from BPL or low-income families.",
        "eligibility_criteria": "Applicant family must be permanent residents of Uttarakhand. Annual family income must not exceed Rs. 72,000 in rural areas or Rs. 15,000 monthly income criteria. Must not have married before 18 years.",
        "age_criteria": "Birth stage: Within 6 months of birth. Intermediate stage: Unmarried girl passing Class 12.",
        "income_criteria": "Family annual income up to Rs. 72,000 or verified BPL status.",
        "required_documents": [
            "Uttarakhand Permanent Residence / Domicile Certificate",
            "Birth Certificate of girl child",
            "Class 12 marksheet and higher education admission receipt",
            "Income Certificate",
            "Parivar Register copy"
        ],
        "application_process": "Applications are submitted through the Anganwadi Centre, Child Development Project Officer (CDPO) office, or via the Uttarakhand Apuni Sarkar portal.",
        "application_mode": "Online via Apuni Sarkar Portal (eservices.uk.gov.in) / Offline at Anganwadi Centres",
        "exclusions": "Girls married before attaining 18 years of age; Families having more than two surviving children (except twins); Non-residents of Uttarakhand.",
        "relevant_pages": [1, 2],
        "guideline_title": "Welfare Guidelines: Girl Child Empowerment in Hill States",
        "pdf_filename": "doc2025121487401.pdf"
    },
    "SCHEME-UK-OLD-AGE": {
        "objectives": "To provide dignified social security and basic sustenance to destitute elderly citizens without family support.",
        "beneficiaries": "Senior citizens aged 60 years and above residing in Uttarakhand from BPL families or whose monthly family income is below Rs. 4,000.",
        "eligibility_criteria": "Age 60 years or above; Permanent resident of Uttarakhand; BPL cardholder or monthly family income not exceeding Rs. 4,000; Must not be receiving pension from Central/State Government or local bodies.",
        "age_criteria": "60 years and above.",
        "income_criteria": "BPL family or monthly household income not exceeding Rs. 4,000.",
        "required_documents": [
            "Age proof (Aadhaar / Voter ID / Birth Certificate)",
            "Uttarakhand Domicile / Residence Certificate",
            "BPL Card or Income Certificate from Tehsildar",
            "Bank Passbook",
            "Passport size photo"
        ],
        "application_process": "Apply online through the Uttarakhand Citizen Portal (ssp.uk.gov.in) or submit the application form to the Gram Panchayat Development Officer or District Social Welfare Officer.",
        "application_mode": "Online (ssp.uk.gov.in) / Offline at Block Development Office",
        "exclusions": "Elderly citizens whose sons/grandsons are in regular government or organized private employment; Persons receiving other government pensions.",
        "relevant_pages": [1, 2],
        "guideline_title": "Uttarakhand Social Security Pension Operational Manual",
        "pdf_filename": "doc202110101.pdf"
    },
    "SCHEME-UK-WIDOW": {
        "objectives": "To ensure social protection, health, and economic independence for destitute widows who lack financial means.",
        "beneficiaries": "Widows aged 18 years and above residing in Uttarakhand with low family income.",
        "eligibility_criteria": "Woman aged 18 years or older whose husband is deceased; Permanent resident of Uttarakhand; BPL household or annual family income below Rs. 48,000.",
        "age_criteria": "18 years and above.",
        "income_criteria": "BPL family or annual family income not exceeding Rs. 48,000.",
        "required_documents": [
            "Husband's Death Certificate",
            "Proof of Age (Aadhaar / Voter ID)",
            "Uttarakhand Residence proof",
            "Income Certificate",
            "Bank Passbook",
            "Passport size photo"
        ],
        "application_process": "Apply online at ssp.uk.gov.in or submit the physical form at the Block Office or Nagar Nigam / Nagar Palika.",
        "application_mode": "Online (ssp.uk.gov.in) / Offline at Municipal / Block Office",
        "exclusions": "Remarried widows; Widows receiving family pension from central or state government; Widows with adult sons who have sufficient regular income.",
        "relevant_pages": [2, 3],
        "guideline_title": "Social Welfare Department Guidelines for Destitute Women",
        "pdf_filename": "doc202110101.pdf"
    },
    "SCHEME-UK-DISABILITY": {
        "objectives": "To provide economic security and medical support to persons with disabilities living in the state.",
        "beneficiaries": "Specially-abled persons having 40% or higher disability certified by Chief Medical Officer (CMO).",
        "eligibility_criteria": "Permanent resident of Uttarakhand; Certified disability of 40% or higher; BPL family or family income within prescribed limits; Not availing other government pensions.",
        "age_criteria": "All ages (from birth onwards for severely disabled).",
        "income_criteria": "BPL family or annual family income within notified poverty limits (not applicable in case of severe 80%+ disability).",
        "required_documents": [
            "Disability Certificate / UDID card issued by Medical Board / CMO",
            "Uttarakhand Domicile",
            "Income Certificate / BPL Card",
            "Bank Account details",
            "Aadhaar Card"
        ],
        "application_process": "Register online at ssp.uk.gov.in with UDID card number or submit through the District Social Welfare Office / CMO office.",
        "application_mode": "Online via ssp.uk.gov.in / Offline at District Social Welfare Office",
        "exclusions": "Persons receiving disability pension from any other state or armed forces/government service.",
        "relevant_pages": [3, 4],
        "guideline_title": "Disability Welfare and Social Security Manual",
        "pdf_filename": "doc202110101.pdf"
    }
}

