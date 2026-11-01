"""Questionnaire and Profile Schema for Citizen Eligibility Determination.

Defines the 7 progressive categories, question metadata, input controls,
conditional display logic, skip/not sure support, and bilingual translations.
"""

from typing import Any, Dict, List, Optional


QUESTIONNAIRE_CATEGORIES: List[Dict[str, Any]] = [
    {
        "id": "personal",
        "step": 1,
        "title_en": "Personal Information",
        "title_hi": "व्यक्तिगत जानकारी",
        "desc_en": "Basic demographic identity and family attributes.",
        "desc_hi": "मूल जनसांख्यिकीय पहचान और पारिवारिक विवरण।"
    },
    {
        "id": "residential",
        "step": 2,
        "title_en": "Residential Information",
        "title_hi": "निवास संबंधी जानकारी",
        "desc_en": "Location, permanent domicile, and rural/urban classification.",
        "desc_hi": "स्थान, स्थायी निवास और ग्रामीण/शहरी वर्गीकरण।"
    },
    {
        "id": "financial",
        "step": 3,
        "title_en": "Financial Information",
        "title_hi": "वित्तीय जानकारी",
        "desc_en": "Annual family income, poverty line status, and taxation.",
        "desc_hi": "पारिवारिक वार्षिक आय, गरीबी रेखा स्थिति और कर संबंधी विवरण।"
    },
    {
        "id": "employment",
        "step": 4,
        "title_en": "Employment & Occupation",
        "title_hi": "रोजगार और व्यवसाय",
        "desc_en": "Work sector, occupational role, and unorganized labor.",
        "desc_hi": "कार्य क्षेत्र, व्यावसायिक भूमिका और असंगठित श्रमिक स्थिति।"
    },
    {
        "id": "agricultural",
        "step": 5,
        "title_en": "Agricultural Information",
        "title_hi": "कृषि संबंधी जानकारी",
        "desc_en": "Farmland ownership, landholding size, and crop cultivation.",
        "desc_hi": "कृषि भूमि स्वामित्व, जोत का आकार और फसल उत्पादन।"
    },
    {
        "id": "education",
        "step": 6,
        "title_en": "Education & Academics",
        "title_hi": "शिक्षा और अकादमिक जानकारी",
        "desc_en": "Academic qualifications, current enrollment, and merit percentiles.",
        "desc_hi": "शैक्षणिक योग्यता, वर्तमान नामांकन और मेरिट परसेंटाइल।"
    },
    {
        "id": "documents",
        "step": 7,
        "title_en": "Documents & Identification",
        "title_hi": "दस्तावेज और पहचान",
        "desc_en": "Aadhaar, Jan Dhan bank account, and official certificates.",
        "desc_hi": "आधार, जन धन बैंक खाता और आधिकारिक प्रमाण पत्र।"
    }
]


ELIGIBILITY_QUESTIONS: List[Dict[str, Any]] = [
    # =========================================================================
    # STEP 1: Personal Information
    # =========================================================================
    {
        "id": "q_age",
        "field": "age",
        "category": "personal",
        "type": "number",
        "label_en": "What is your current age?",
        "label_hi": "आपकी वर्तमान आयु क्या है?",
        "placeholder_en": "Enter age in years (e.g. 45)",
        "placeholder_hi": "वर्षों में आयु दर्ज करें (उदा. 45)",
        "min": 0,
        "max": 120,
        "required": True,
        "tooltip_en": "Age determines qualification for senior citizen top-ups, old age pensions, and youth scholarships.",
        "tooltip_hi": "आयु वरिष्ठ नागरिक योजनाओं, वृद्धावस्था पेंशन और युवा छात्रवृत्ति की पात्रता तय करती है।"
    },
    {
        "id": "q_gender",
        "field": "gender",
        "category": "personal",
        "type": "select",
        "label_en": "Gender",
        "label_hi": "लिंग",
        "options": [
            {"value": "female", "label_en": "Female (महिला)", "label_hi": "महिला"},
            {"value": "male", "label_en": "Male (पुरुष)", "label_hi": "पुरुष"},
            {"value": "transgender", "label_en": "Transgender (तृतीय लिंग)", "label_hi": "तृतीय लिंग"},
            {"value": "other", "label_en": "Other (अन्य)", "label_hi": "अन्य"}
        ],
        "required": True,
        "tooltip_en": "Several state and central welfare initiatives are dedicated exclusively to women or transgender citizens.",
        "tooltip_hi": "अनेक राज्य एवं केंद्रीय कल्याणकारी योजनाएं विशेष रूप से महिलाओं या ट्रांसजेंडर नागरिकों हेतु समर्पित हैं।"
    },
    {
        "id": "q_marital_status",
        "field": "marital_status",
        "category": "personal",
        "type": "select",
        "label_en": "Marital Status",
        "label_hi": "वैवाहिक स्थिति",
        "options": [
            {"value": "married", "label_en": "Married (विवाहित)", "label_hi": "विवाहित"},
            {"value": "unmarried", "label_en": "Unmarried / Single (अविवाहित)", "label_hi": "अविवाहित"},
            {"value": "widowed", "label_en": "Widow / Widower (विधवा / विधुर)", "label_hi": "विधवा / विधुर"},
            {"value": "divorced", "label_en": "Divorced / Separated (तलाकशुदा / परित्यक्ता)", "label_hi": "तलाकशुदा / परित्यक्ता"}
        ],
        "required": False,
        "tooltip_en": "Widow pension and family welfare schemes require marital verification.",
        "tooltip_hi": "विधवा पेंशन एवं परिवार कल्याण योजनाओं हेतु वैवाहिक स्थिति सत्यापन आवश्यक है।"
    },
    {
        "id": "q_caste_category",
        "field": "caste_category",
        "category": "personal",
        "type": "select",
        "label_en": "Social Category / Caste",
        "label_hi": "सामाजिक श्रेणी / जाति",
        "options": [
            {"value": "general", "label_en": "General (सामान्य)", "label_hi": "सामान्य"},
            {"value": "obc", "label_en": "OBC - Other Backward Class (अन्य पिछड़ा वर्ग)", "label_hi": "अन्य पिछड़ा वर्ग (OBC)"},
            {"value": "sc", "label_en": "SC - Scheduled Caste (अनुसूचित जाति)", "label_hi": "अनुसूचित जाति (SC)"},
            {"value": "st", "label_en": "ST - Scheduled Tribe (अनुसूचित जनजाति)", "label_hi": "अनुसूचित जनजाति (ST)"}
        ],
        "required": True,
        "tooltip_en": "Determines qualification for affirmative action, reservation quotas, and targeted tribal/SC welfare grants.",
        "tooltip_hi": "आरक्षण कोटा, अनुसूचित जाति/जनजाति कल्याण अनुदान और विशेष छात्रवृत्ति हेतु आवश्यक।"
    },
    {
        "id": "q_minority_status",
        "field": "minority_status",
        "category": "personal",
        "type": "boolean",
        "label_en": "Do you belong to a notified religious or linguistic minority community?",
        "label_hi": "क्या आप अधिसूचित धार्मिक या भाषाई अल्पसंख्यक समुदाय से संबंधित हैं?",
        "required": False,
        "tooltip_en": "Ministry of Minority Affairs provides specialized pre-matric and merit scholarships.",
        "tooltip_hi": "अल्पसंख्यक कार्य मंत्रालय विशेष छात्रवृत्ति एवं कौशल विकास योजनाएं प्रदान करता है।"
    },
    {
        "id": "q_is_differently_abled",
        "field": "is_differently_abled",
        "category": "personal",
        "type": "boolean",
        "label_en": "Do you have any physical disability or special needs (Divyangjan)?",
        "label_hi": "क्या आप दिव्यांगजन हैं (शारीरिक रूप से अक्षम)?",
        "required": True,
        "tooltip_en": "Qualifies for disability pensions, assistive device subsidies (ADIP), and mobility allowances.",
        "tooltip_hi": "दिव्यांग पेंशन, सहायक उपकरण अनुदान (ADIP) और यात्रा भत्तों के लिए पात्रता निर्धारित करता है।"
    },
    {
        "id": "q_disability_percentage",
        "field": "disability_percentage",
        "category": "personal",
        "type": "number",
        "label_en": "What is your certified disability percentage?",
        "label_hi": "आपका प्रमाणित दिव्यांगता प्रतिशत कितना है?",
        "placeholder_en": "e.g. 40",
        "placeholder_hi": "उदा. 40",
        "min": 0,
        "max": 100,
        "required": False,
        "depends_on": {"field": "is_differently_abled", "value": True},
        "tooltip_en": "Most statutory disability benefits require >= 40% certified disability.",
        "tooltip_hi": "अधिकांश योजनाओं हेतु 40% या अधिक प्रमाणित दिव्यांगता अनिवार्य होती है।"
    },
    {
        "id": "q_has_disability_certificate",
        "field": "has_disability_certificate",
        "category": "personal",
        "type": "boolean",
        "label_en": "Do you hold a valid UDID card or government disability certificate?",
        "label_hi": "क्या आपके पास मान्य यूडीआईडी (UDID) कार्ड या सरकारी दिव्यांग प्रमाण पत्र है?",
        "required": False,
        "depends_on": {"field": "is_differently_abled", "value": True},
        "tooltip_en": "UDID card enables one-click national verification across welfare portals.",
        "tooltip_hi": "यूडीआईडी कार्ड राष्ट्रीय स्तर पर योजनाओं में त्वरित सत्यापन सक्षम करता है।"
    },

    # =========================================================================
    # STEP 2: Residential Information
    # =========================================================================
    {
        "id": "q_state",
        "field": "state",
        "category": "residential",
        "type": "select",
        "label_en": "State or Union Territory of Permanent Domicile",
        "label_hi": "स्थायी निवास का राज्य / केंद्र शासित प्रदेश",
        "options": [
            {"value": "UK", "label_en": "Uttarakhand (उत्तराखंड)", "label_hi": "उत्तराखंड"},
            {"value": "UP", "label_en": "Uttar Pradesh (उत्तर प्रदेश)", "label_hi": "उत्तर प्रदेश"},
            {"value": "DL", "label_en": "Delhi (दिल्ली)", "label_hi": "दिल्ली"},
            {"value": "MH", "label_en": "Maharashtra (महाराष्ट्र)", "label_hi": "महाराष्ट्र"},
            {"value": "BR", "label_en": "Bihar (बिहार)", "label_hi": "बिहार"},
            {"value": "MP", "label_en": "Madhya Pradesh (मध्य प्रदेश)", "label_hi": "मध्य प्रदेश"},
            {"value": "RJ", "label_en": "Rajasthan (राजस्थान)", "label_hi": "राजस्थान"},
            {"value": "KA", "label_en": "Karnataka (कर्नाटक)", "label_hi": "कर्नाटक"},
            {"value": "TN", "label_en": "Tamil Nadu (तमिलनाडु)", "label_hi": "तमिलनाडु"},
            {"value": "WB", "label_en": "West Bengal (पश्चिम बंगाल)", "label_hi": "पश्चिम बंगाल"},
            {"value": "GJ", "label_en": "Gujarat (गुजरात)", "label_hi": "गुजरात"},
            {"value": "HR", "label_en": "Haryana (हरियाणा)", "label_hi": "हरियाणा"},
            {"value": "PB", "label_en": "Punjab (पंजाब)", "label_hi": "पंजाब"},
            {"value": "OTHER", "label_en": "Other State / UT", "label_hi": "अन्य राज्य / केंद्र शासित प्रदेश"}
        ],
        "required": True,
        "tooltip_en": "Certain state-sponsored welfare programs require permanent domicile.",
        "tooltip_hi": "कुछ राज्य-प्रायोजित कल्याणकारी योजनाओं हेतु स्थायी निवास अनिवार्य है।"
    },
    {
        "id": "q_district",
        "field": "district",
        "category": "residential",
        "type": "text",
        "label_en": "District Name",
        "label_hi": "जिले का नाम",
        "placeholder_en": "Enter your district (e.g. Dehradun, Lucknow)",
        "placeholder_hi": "अपना जिला दर्ज करें (उदा. देहरादून, लखनऊ)",
        "required": False,
        "tooltip_en": "Used to pinpoint local Common Service Centres and district offices.",
        "tooltip_hi": "स्थानीय जन सेवा केंद्र (CSC) और जिला कार्यालयों का पता लगाने हेतु उपयोगी।"
    },
    {
        "id": "q_pincode",
        "field": "pincode",
        "category": "residential",
        "type": "text",
        "label_en": "6-Digit Postal PIN Code",
        "label_hi": "6-अंकों का पोस्टल पिन कोड",
        "placeholder_en": "e.g. 248001",
        "placeholder_hi": "उदा. 248001",
        "required": False,
        "tooltip_en": "Instant geo-mapping to nearby Seva Kendras.",
        "tooltip_hi": "निकटतम सेवा केंद्रों की तुरंत भौगोलिक मैपिंग हेतु।"
    },
    {
        "id": "q_area_type",
        "field": "area_type",
        "category": "residential",
        "type": "select",
        "label_en": "Area Type (Rural or Urban)",
        "label_hi": "क्षेत्र का प्रकार (ग्रामीण या शहरी)",
        "options": [
            {"value": "rural", "label_en": "Rural / Gram Panchayat (ग्रामीण / ग्राम पंचायत)", "label_hi": "ग्रामीण / ग्राम पंचायत"},
            {"value": "urban", "label_en": "Urban / Municipality (शहरी / नगर पालिका / नगर निगम)", "label_hi": "शहरी / नगर पालिका / नगर निगम"}
        ],
        "required": True,
        "tooltip_en": "PMAY-G and rural employment programs strictly apply to rural jurisdictions.",
        "tooltip_hi": "पीएम आवास ग्रामीण एवं ग्रामीण रोजगार योजनाएं केवल ग्रामीण क्षेत्रों पर लागू होती हैं।"
    },
    {
        "id": "q_is_rural",
        "field": "is_rural_resident",
        "category": "residential",
        "type": "boolean",
        "label_en": "Do you reside in a rural village / Gram Panchayat area?",
        "label_hi": "क्या आप ग्रामीण क्षेत्र / ग्राम पंचायत में निवास करते हैं?",
        "required": True,
        "tooltip_en": "PMAY-G and rural livelihood benefits apply strictly to rural residents.",
        "tooltip_hi": "पीएम आवास ग्रामीण एवं ग्रामीण आजीविका लाभ केवल ग्रामीण निवासियों के लिए हैं।"
    },

    # =========================================================================
    # STEP 3: Financial Information
    # =========================================================================
    {
        "id": "q_annual_income",
        "field": "annual_income",
        "category": "financial",
        "type": "number",
        "label_en": "Total Annual Family Income (in INR)",
        "label_hi": "परिवार की कुल वार्षिक आय (रुपये में)",
        "placeholder_en": "e.g. 120000",
        "placeholder_hi": "उदा. 120000",
        "min": 0,
        "required": True,
        "tooltip_en": "Income limits apply for pensions (e.g. < ₹48,000 for UK Old Age Pension) and scholarships.",
        "tooltip_hi": "पेंशन (उदा. उत्तराखंड वृद्धावस्था पेंशन हेतु < ₹48,000) और छात्रवृत्ति हेतु आय सीमा लागू होती है।"
    },
    {
        "id": "q_is_bpl",
        "field": "is_bpl",
        "category": "financial",
        "type": "boolean",
        "label_en": "Does your family hold a Below Poverty Line (BPL) or Antyodaya ration card?",
        "label_hi": "क्या आपके परिवार के पास बीपीएल (BPL) या अंत्योदय राशन कार्ड है?",
        "required": True,
        "tooltip_en": "Key qualifier for Ayushman Bharat, subsidized foodgrains, and state pensions.",
        "tooltip_hi": "आयुष्मान भारत, रियायती खाद्यान्न और राज्य पेंशन के लिए प्रमुख पात्रता।"
    },
    {
        "id": "q_ration_card_type",
        "field": "ration_card_type",
        "category": "financial",
        "type": "select",
        "label_en": "Ration Card Category",
        "label_hi": "राशन कार्ड की श्रेणी",
        "options": [
            {"value": "none", "label_en": "No Ration Card (कोई राशन कार्ड नहीं)", "label_hi": "कोई राशन कार्ड नहीं"},
            {"value": "apl", "label_en": "APL / Non-Priority (सफेद / सामान्य कार्ड)", "label_hi": "सामान्य कार्ड (APL)"},
            {"value": "bpl", "label_en": "BPL / Priority Household (बीपीएल / प्राथमिकता परिवार)", "label_hi": "बीपीएल / प्राथमिकता परिवार (PHH)"},
            {"value": "antyodaya", "label_en": "AAY / Antyodaya Anna Yojana (अंत्योदय अन्न योजना)", "label_hi": "अंत्योदय अन्न योजना (AAY)"}
        ],
        "required": False,
        "tooltip_en": "Antyodaya and PHH cardholders receive statutory top priority in central welfare grants.",
        "tooltip_hi": "अंत्योदय एवं पीएचएच कार्डधारकों को केंद्रीय योजनाओं में सर्वोच्च प्राथमिकता मिलती है।"
    },
    {
        "id": "q_tax_payer",
        "field": "is_income_tax_payer",
        "category": "financial",
        "type": "boolean",
        "label_en": "Did you or any member of your family pay income tax in the last financial year?",
        "label_hi": "क्या आपने या आपके परिवार के किसी सदस्य ने पिछले वित्तीय वर्ष में आयकर दिया है?",
        "required": True,
        "tooltip_en": "Income tax payers are excluded by statute from PM-KISAN and BPL assistance.",
        "tooltip_hi": "आयकर दाता कानूनन पीएम-किसान और बीपीएल सहायता से बाहर हैं।"
    },
    {
        "id": "q_secc_deprived",
        "field": "secc_deprived",
        "category": "financial",
        "type": "boolean",
        "label_en": "Is your household covered under SECC 2011 deprivation criteria (D1-D7)?",
        "label_hi": "क्या आपका परिवार सामाजिक-आर्थिक जाति जनगणना (SECC 2011) अभाव सूची में शामिल है?",
        "required": False,
        "official_verification_required": True,
        "tooltip_en": "Automatic inclusion criterion for PM-JAY and PMAY-G.",
        "tooltip_hi": "पीएम-जेएवाई और पीएमएवाई-जी के लिए स्वतः समावेशन शर्त।"
    },

    # =========================================================================
    # STEP 4: Employment & Occupation
    # =========================================================================
    {
        "id": "q_employment_type",
        "field": "employment_type",
        "category": "employment",
        "type": "select",
        "label_en": "Primary Employment Type",
        "label_hi": "प्रमुख रोजगार का प्रकार",
        "options": [
            {"value": "daily_wage", "label_en": "Daily Wage Worker / Laborer (दैनिक वेतनभोगी / मजदूर)", "label_hi": "दैनिक वेतनभोगी / मजदूर"},
            {"value": "self_employed", "label_en": "Self-Employed / Artisan / Vendor (स्व-नियोजित / कारीगर / फेरीवाले)", "label_hi": "स्व-नियोजित / कारीगर"},
            {"value": "unemployed", "label_en": "Unemployed / Seeking Work (बेरोजगार)", "label_hi": "बेरोजगार"},
            {"value": "salaried_private", "label_en": "Salaried Private Employee (निजी वेतनभोगी)", "label_hi": "निजी वेतनभोगी"},
            {"value": "salaried_govt", "label_en": "Government / PSU Employee (सरकारी कर्मचारी)", "label_hi": "सरकारी कर्मचारी"},
            {"value": "student", "label_en": "Student (विद्यार्थी)", "label_hi": "विद्यार्थी"},
            {"value": "retired", "label_en": "Retired / Pensioner (सेवानिवृत्त / पेंशनभोगी)", "label_hi": "सेवानिवृत्त"}
        ],
        "required": True,
        "tooltip_en": "Determines social security coverage, PMSYM pension eligibility, and skill allowances.",
        "tooltip_hi": "सामाजिक सुरक्षा, पीएम-श्रम योगी मानधन पेंशन और कौशल विकास भत्तों हेतु आवश्यक।"
    },
    {
        "id": "q_occupation",
        "field": "occupation",
        "category": "employment",
        "type": "text",
        "label_en": "Specific Occupation / Trade",
        "label_hi": "विशिष्ट पेशा / व्यवसाय",
        "placeholder_en": "e.g. Mason, Street Vendor, Electrician, Farmer",
        "placeholder_hi": "उदा. राजमिस्त्री, पटरी विक्रेता, बढ़ई, किसान",
        "required": False,
        "tooltip_en": "PM Vishwakarma provides collateral-free credit and toolkit grants to traditional artisans.",
        "tooltip_hi": "पीएम विश्वकर्मा योजना पारंपरिक शिल्पकारों को टूलकिट अनुदान और सस्ता ऋण देती है।"
    },
    {
        "id": "q_is_unorganized_worker",
        "field": "is_unorganized_worker",
        "category": "employment",
        "type": "boolean",
        "label_en": "Are you registered as an unorganized worker on e-Shram?",
        "label_hi": "क्या आप ई-श्रम पोर्टल पर असंगठित श्रमिक के रूप में पंजीकृत हैं?",
        "required": False,
        "tooltip_en": "e-Shram registration unlocks accidental insurance and portable social security.",
        "tooltip_hi": "ई-श्रम पंजीकरण से 2 लाख रुपये का दुर्घटना बीमा और सामाजिक सुरक्षा प्राप्त होती है।"
    },
    {
        "id": "q_const_holder",
        "field": "is_constitutional_post_holder",
        "category": "employment",
        "type": "boolean",
        "label_en": "Are you or your spouse former or present holders of constitutional posts, MP, or MLA?",
        "label_hi": "क्या आप या आपके जीवनसाथी संवैधानिक पद धारक, सांसद या विधायक (पूर्व या वर्तमान) हैं?",
        "required": False,
        "tooltip_en": "Disqualifying exclusion under Central Sector guidelines.",
        "tooltip_hi": "केंद्रीय क्षेत्र दिशा-निर्देशों के तहत अपात्रता शर्त।"
    },

    # =========================================================================
    # STEP 5: Agricultural Information
    # =========================================================================
    {
        "id": "q_is_farmer",
        "field": "is_farmer",
        "category": "agricultural",
        "type": "boolean",
        "label_en": "Are you or your family engaged in farming / agriculture?",
        "label_hi": "क्या आप या आपका परिवार कृषि / खेती से जुड़ा है?",
        "required": True,
        "tooltip_en": "Required for PM-KISAN, crop insurance, and Kisan Credit Card.",
        "tooltip_hi": "पीएम-किसान, फसल बीमा एवं किसान क्रेडिट कार्ड हेतु आवश्यक।"
    },
    {
        "id": "q_owns_land",
        "field": "owns_cultivable_land",
        "category": "agricultural",
        "type": "boolean",
        "label_en": "Do you own cultivable agricultural land in your name?",
        "label_hi": "क्या आपके नाम पर कृषि योग्य भूमि दर्ज है?",
        "required": False,
        "depends_on": {"field": "is_farmer", "value": True},
        "tooltip_en": "PM-KISAN guidelines require ownership of cultivable land as per state revenue records.",
        "tooltip_hi": "पीएम-किसान दिशा-निर्देशों के अनुसार राजस्व अभिलेखों में भूमि स्वामित्व आवश्यक है।"
    },
    {
        "id": "q_landholding_acres",
        "field": "landholding_acres",
        "category": "agricultural",
        "type": "number",
        "label_en": "Cultivable Agricultural Landholding Size (in Acres)",
        "label_hi": "कृषि योग्य भूमि का कुल आकार (एकड़ में)",
        "placeholder_en": "e.g. 2.5",
        "placeholder_hi": "उदा. 2.5",
        "min": 0,
        "required": False,
        "depends_on": {"field": "is_farmer", "value": True},
        "tooltip_en": "Small and marginal farmers (< 5 acres) qualify for concessional credit and priority subsidies.",
        "tooltip_hi": "लघु एवं सीमांत किसान (5 एकड़ से कम) रियायती ब्याज दर एवं विशेष अनुदान के पात्र हैं।"
    },
    {
        "id": "q_land_ownership_type",
        "field": "land_ownership_type",
        "category": "agricultural",
        "type": "select",
        "label_en": "Land Ownership Classification",
        "label_hi": "भूमि स्वामित्व का प्रकार",
        "options": [
            {"value": "individual", "label_en": "Individual Farmer / Self Owned (व्यक्तिगत स्वामित्व)", "label_hi": "व्यक्तिगत स्वामित्व"},
            {"value": "joint", "label_en": "Joint Family Landholding (संयुक्त पारिवारिक भूमि)", "label_hi": "संयुक्त पारिवारिक भूमि"},
            {"value": "tenant", "label_en": "Tenant Farmer / Sharecropper (बटाईदार / पट्टेदार किसान)", "label_hi": "बटाईदार / पट्टेदार किसान"},
            {"value": "institutional", "label_en": "Institutional / Trust / Company (संस्थागत भूमि)", "label_hi": "संस्थागत भूमि"}
        ],
        "required": False,
        "depends_on": {"field": "is_farmer", "value": True},
        "tooltip_en": "Institutional landholders are legally excluded from direct farmer income support.",
        "tooltip_hi": "संस्थागत भूमिधारक कानूनन किसान प्रत्यक्ष आय सहायता के पात्र नहीं हैं।"
    },
    {
        "id": "q_inst_holder",
        "field": "is_institutional_landholder",
        "category": "agricultural",
        "type": "boolean",
        "label_en": "Is the agricultural land registered to an institution, trust, or company?",
        "label_hi": "क्या कृषि भूमि किसी संस्था, ट्रस्ट या कंपनी के नाम पर दर्ज है?",
        "required": False,
        "depends_on": {"field": "is_farmer", "value": True},
        "tooltip_en": "Only individual farming families are eligible for farmer cash assistance.",
        "tooltip_hi": "केवल व्यक्तिगत कृषक परिवार ही किसान नकद सहायता के पात्र हैं।"
    },

    # =========================================================================
    # STEP 6: Education & Academics
    # =========================================================================
    {
        "id": "q_highest_education",
        "field": "highest_education",
        "category": "education",
        "type": "select",
        "label_en": "Highest Educational Qualification",
        "label_hi": "उच्चतम शैक्षणिक योग्यता",
        "options": [
            {"value": "illiterate", "label_en": "No Formal Schooling / Illiterate (कोई औपचारिक शिक्षा नहीं)", "label_hi": "कोई औपचारिक शिक्षा नहीं"},
            {"value": "primary", "label_en": "Primary School (कक्षा 5 तक)", "label_hi": "कक्षा 5 तक"},
            {"value": "secondary", "label_en": "10th Pass / Secondary (मैट्रिक / 10वीं पास)", "label_hi": "10वीं पास"},
            {"value": "higher_secondary", "label_en": "12th Pass / Higher Secondary (इंटरमीडिएट / 12वीं)", "label_hi": "12वीं पास"},
            {"value": "diploma", "label_en": "Diploma / ITI / Polytechnic (डिप्लोमा / आईटीआई)", "label_hi": "डिप्लोमा / आईटीआई"},
            {"value": "graduate", "label_en": "Bachelor's Degree / Graduate (स्नातक / बीए / बीएससी / बीटेक)", "label_hi": "स्नातक"},
            {"value": "post_graduate", "label_en": "Master's Degree or Higher (परास्नातक या उच्चतर)", "label_hi": "परास्नातक"}
        ],
        "required": True,
        "tooltip_en": "Determines scholarship eligibility and skill upgradation stipends.",
        "tooltip_hi": "छात्रवृत्ति पात्रता और कौशल विकास वजीफे तय करता है।"
    },
    {
        "id": "q_is_student",
        "field": "is_student",
        "category": "education",
        "type": "boolean",
        "label_en": "Are you currently enrolled as a student in an educational institution?",
        "label_hi": "क्या आप वर्तमान में किसी शैक्षणिक संस्थान में छात्र के रूप में अध्ययनरत हैं?",
        "required": True,
        "tooltip_en": "Active student status is required for national scholarship portal (NSP) schemes.",
        "tooltip_hi": "राष्ट्रीय छात्रवृत्ति पोर्टल (NSP) की योजनाओं हेतु सक्रिय छात्र होना अनिवार्य है।"
    },
    {
        "id": "q_current_course",
        "field": "current_course",
        "category": "education",
        "type": "text",
        "label_en": "Current Course / Degree",
        "label_hi": "वर्तमान पाठ्यक्रम / डिग्री",
        "placeholder_en": "e.g. B.Tech Computer Science, MBBS, Class 12 Science",
        "placeholder_hi": "उदा. बी.टेक, 12वीं विज्ञान, आईटीआई फिटर",
        "required": False,
        "depends_on": {"field": "is_student", "value": True},
        "tooltip_en": "Professional and technical courses qualify for higher scholarship amounts.",
        "tooltip_hi": "व्यावसायिक एवं तकनीकी पाठ्यक्रमों हेतु उच्च छात्रवृत्ति राशि स्वीकृत होती है।"
    },
    {
        "id": "q_institution_type",
        "field": "institution_type",
        "category": "education",
        "type": "select",
        "label_en": "Educational Institution Type",
        "label_hi": "शैक्षणिक संस्थान का प्रकार",
        "options": [
            {"value": "govt", "label_en": "Government Institution (सरकारी संस्थान)", "label_hi": "सरकारी संस्थान"},
            {"value": "govt_aided", "label_en": "Government Aided (शासकीय सहायता प्राप्त)", "label_hi": "शासकीय सहायता प्राप्त"},
            {"value": "private_recognized", "label_en": "Private Recognized (मान्यता प्राप्त निजी संस्थान)", "label_hi": "मान्यता प्राप्त निजी संस्थान"},
            {"value": "distance", "label_en": "Distance Learning / Open School (दूरस्थ शिक्षा)", "label_hi": "दूरस्थ शिक्षा"}
        ],
        "required": False,
        "depends_on": {"field": "is_student", "value": True},
        "tooltip_en": "Only institutions with valid AISHE codes are eligible for Central Sector Scholarship.",
        "tooltip_hi": "केवल मान्य एआईआईएचई (AISHE) कोड वाले संस्थान ही छात्रवृत्ति हेतु पात्र हैं।"
    },
    {
        "id": "q_regular_college",
        "field": "is_regular_college_student",
        "category": "education",
        "type": "boolean",
        "label_en": "Are you enrolled in a regular (non-distance) higher education degree course?",
        "label_hi": "क्या आप नियमित (नॉन-डिस्टेंस) उच्च शिक्षा डिग्री पाठ्यक्रम में नामांकित हैं?",
        "required": False,
        "depends_on": {"field": "is_student", "value": True},
        "tooltip_en": "Distance / correspondence courses are ineligible for CSSS.",
        "tooltip_hi": "पत्राचार / दूरस्थ शिक्षा पाठ्यक्रम सीएसएसएस के पात्र नहीं हैं।"
    },
    {
        "id": "q_percentile",
        "field": "percentile_score",
        "category": "education",
        "type": "number",
        "label_en": "Class 12 Board Exam Percentile Score (if applicable)",
        "label_hi": "12वीं बोर्ड परीक्षा परसेंटाइल स्कोर (यदि लागू हो)",
        "placeholder_en": "e.g. 85.5",
        "placeholder_hi": "उदा. 85.5",
        "min": 0,
        "max": 100,
        "required": False,
        "depends_on": {"field": "is_student", "value": True},
        "tooltip_en": "Central Sector Scholarship (CSSS) requires > 80th percentile.",
        "tooltip_hi": "केंद्रीय क्षेत्र छात्रवृत्ति (CSSS) हेतु 80 से अधिक परसेंटाइल आवश्यक है।"
    },

    # =========================================================================
    # STEP 7: Documents & Identification
    # =========================================================================
    {
        "id": "q_has_aadhaar",
        "field": "has_aadhaar",
        "category": "documents",
        "type": "boolean",
        "label_en": "Do you have an active Aadhaar card seeded with your mobile number?",
        "label_hi": "क्या आपके पास मोबाइल नंबर से लिंक सक्रिय आधार कार्ड है?",
        "required": True,
        "tooltip_en": "Mandatory for Aadhaar-based authentication and Direct Benefit Transfer (DBT).",
        "tooltip_hi": "आधार आधारित प्रमाणीकरण एवं डीबीटी नकद अंतरण हेतु अनिवार्य।"
    },
    {
        "id": "q_has_jan_dhan_account",
        "field": "has_jan_dhan_account",
        "category": "documents",
        "type": "boolean",
        "label_en": "Do you have an active Bank / Jan Dhan account enabled for DBT cash transfers?",
        "label_hi": "क्या आपके पास डीबीटी सक्षम बैंक या जन धन खाता है?",
        "required": True,
        "tooltip_en": "Required for receiving government cash installments directly into account.",
        "tooltip_hi": "सरकारी किस्तें सीधे बैंक खाते में प्राप्त करने हेतु आवश्यक।"
    },
    {
        "id": "q_has_ration_card",
        "field": "has_ration_card",
        "category": "documents",
        "type": "boolean",
        "label_en": "Do you have an active NFSA or State Ration Card?",
        "label_hi": "क्या आपके पास सक्रिय एनएफएसए या राज्य राशन कार्ड है?",
        "required": False,
        "tooltip_en": "Used for subsidized grain distribution and proof of household structure.",
        "tooltip_hi": "रियायती राशन वितरण और परिवार संरचना के प्रमाण हेतु।"
    },
    {
        "id": "q_has_land_records",
        "field": "has_land_records",
        "category": "documents",
        "type": "boolean",
        "label_en": "Do you have updated digital land records (RoR / Khatauni / Jamabandi)?",
        "label_hi": "क्या आपके पास अद्यतन डिजिटल भूमि अभिलेख (खतौनी / जमाबंदी) उपलब्ध है?",
        "required": False,
        "tooltip_en": "Essential for PM-KISAN land seeding and agricultural credit.",
        "tooltip_hi": "पीएम-किसान भूलेख अंकन और किसान क्रेडिट कार्ड हेतु अनिवार्य।"
    },
    {
        "id": "q_has_income_certificate",
        "field": "has_income_certificate",
        "category": "documents",
        "type": "boolean",
        "label_en": "Do you hold a valid Income Certificate issued by Revenue Authority (Tehsildar/SDM)?",
        "label_hi": "क्या आपके पास सक्षम राजस्व अधिकारी द्वारा जारी आय प्रमाण पत्र है?",
        "required": False,
        "tooltip_en": "Required to prove income ceiling compliance for pensions and fee waivers.",
        "tooltip_hi": "पेंशन एवं शुल्क प्रतिपूर्ति हेतु आय सीमा प्रमाण के रूप में आवश्यक।"
    },
    {
        "id": "q_has_caste_certificate",
        "field": "has_caste_certificate",
        "category": "documents",
        "type": "boolean",
        "label_en": "Do you hold an official Caste Certificate (SC/ST/OBC)?",
        "label_hi": "क्या आपके पास आधिकारिक जाति प्रमाण पत्र (SC/ST/OBC) उपलब्ध है?",
        "required": False,
        "tooltip_en": "Required to claim affirmative action scholarships and reserved welfare quotas.",
        "tooltip_hi": "आरक्षित श्रेणी छात्रवृत्ति और विशेष कोटा लाभ प्राप्त करने हेतु अनिवार्य।"
    },
    {
        "id": "q_has_pucca_house",
        "field": "has_pucca_house",
        "category": "documents",
        "type": "boolean",
        "label_en": "Do you or your family own a permanent (pucca) house anywhere in India?",
        "label_hi": "क्या आपके या आपके परिवार के पास भारत में कहीं भी पक्का मकान है?",
        "required": True,
        "tooltip_en": "Houseless and kutcha house residents are prioritized for housing subsidies under PMAY.",
        "tooltip_hi": "बेघर एवं कच्चे मकान में रहने वाले परिवारों को पीएम आवास अनुदान में प्राथमिकता मिलती है।"
    },
    {
        "id": "q_ekyc_completed",
        "field": "ekyc_completed",
        "category": "documents",
        "type": "boolean",
        "label_en": "Have you completed biometric or OTP e-KYC on the scheme portal?",
        "label_hi": "क्या आपने योजना पोर्टल पर बायोमेट्रिक या ओटीपी ई-केवाईसी पूरा कर लिया है?",
        "required": False,
        "official_verification_required": True,
        "tooltip_en": "Required for release of benefits under PM-KISAN.",
        "tooltip_hi": "पीएम-किसान की किस्तों के निर्बाध अंतरण हेतु आवश्यक।"
    }
]


def get_all_questions() -> List[Dict[str, Any]]:
    """Returns the complete standardized question catalog."""
    return ELIGIBILITY_QUESTIONS


def get_categories() -> List[Dict[str, Any]]:
    """Returns the 7 progressive category definitions."""
    return QUESTIONNAIRE_CATEGORIES
