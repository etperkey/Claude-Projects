// ContentData - All satirical content for The American Cancer Experience

const ContentData = {
  // Trump tweets and executive orders
  trumpTweets: [
    {
      id: 'trump_1',
      text: "Just signed TREMENDOUS executive order. Insurance companies can now deny 'pre-existing conditions' again. MAGA!",
      effects: { coverage: -15, hope: -10, acaStatus: 'weakened' }
    },
    {
      id: 'trump_2',
      text: "Obamacare is DEAD. Many people are saying my healthcare plan is the best. Details coming in 2 weeks!",
      effects: { coverage: -10, hope: -5 }
    },
    {
      id: 'trump_3',
      text: "Why should TAXPAYERS pay for other people's cancer? Personal responsibility, folks!",
      effects: { hope: -15 }
    },
    {
      id: 'trump_4',
      text: "The FAKE NEWS media won't tell you that cancer rates are DOWN since I took office. Many people are saying this!",
      effects: { hope: -5 }
    },
    {
      id: 'trump_5',
      text: "Just spoke with insurance CEOs. GREAT people! They're going to make healthcare so affordable. Trust me!",
      effects: { coverage: -5 }
    },
    {
      id: 'trump_6',
      text: "Medicare is SOCIALISM. We're going to phase it out and replace it with something BEAUTIFUL. Details in 2 weeks!",
      effects: { coverage: -20, hope: -15 }
    },
    {
      id: 'trump_7',
      text: "Signed order allowing drug companies to charge 'market rates.' FREE MARKET! Prices will go DOWN, believe me!",
      effects: { drugCosts: true, hope: -10 }
    },
    {
      id: 'trump_8',
      text: "WITCH HUNT against insurance companies must stop! They're just trying to run a business. Very unfair!",
      effects: { coverage: -5 }
    },
    {
      id: 'trump_9',
      text: "My uncle was a doctor, great genes, the best genes. I understand medicine better than most doctors. Believe me!",
      effects: { hope: -5 }
    },
    {
      id: 'trump_10',
      text: "ACA subsidies are WELFARE. Ending them TODAY. If you can't afford insurance, maybe work harder?",
      effects: { coverage: -25, hope: -20, acaStatus: 'repealed' }
    }
  ],

  // RFK Jr. events
  rfkEvents: [
    {
      id: 'rfk_1',
      headline: "New HHS Secretary RFK Jr. announces 'natural healing initiative' - chemo funding cut 40%",
      description: "Alternative treatments to be prioritized over 'toxic chemicals'",
      effects: { coverage: -20, hope: -15, fdaStatus: 'compromised' }
    },
    {
      id: 'rfk_2',
      headline: "FDA approval process 'streamlined' - clinical trials now optional for 'alternative treatments'",
      description: "RFK Jr.: 'The pharmaceutical industrial complex has been blocking cures for decades'",
      effects: { fdaStatus: 'compromised', hope: -10 }
    },
    {
      id: 'rfk_3',
      headline: "RFK Jr.: 'The body has an immune system for a reason. Maybe cancer is just a message.'",
      description: "HHS Secretary suggests meditation and raw milk as cancer treatment",
      effects: { hope: -20, coverage: -10 }
    },
    {
      id: 'rfk_4',
      headline: "RFK Jr. disbands FDA cancer drug review board",
      description: "'Big Pharma has captured these agencies. We're starting fresh.'",
      effects: { fdaStatus: 'compromised', coverage: -15 }
    },
    {
      id: 'rfk_5',
      headline: "New HHS policy: Insurance must cover 'alternative medicine' equally with chemotherapy",
      description: "Essential oils and crystal healing now reimbursable at same rate as oncology",
      effects: { coverage: -10 }
    },
    {
      id: 'rfk_6',
      headline: "RFK Jr. questions 'cancer industry': 'Are we sure tumors are actually bad?'",
      description: "HHS Secretary suggests cancer research has been 'corrupted by profit motive'",
      effects: { hope: -25 }
    },
    {
      id: 'rfk_7',
      headline: "Chemotherapy warning labels now required: 'This treatment contains toxic chemicals'",
      description: "New HHS mandate requires informed consent forms listing 'natural alternatives'",
      effects: { hope: -10 }
    },
    {
      id: 'rfk_8',
      headline: "RFK Jr. promotes 'terrain theory': 'Cancer can't grow in an alkaline body'",
      description: "HHS website now features baking soda protocols alongside treatment guidelines",
      effects: { hope: -15, fdaStatus: 'compromised' }
    }
  ],

  // Congressional events
  congressEvents: [
    {
      id: 'congress_1',
      headline: "Senate votes down $35 insulin cap",
      description: "Your senator received $2.3M from Pharma PACs last year",
      effects: { hope: -15, drugCosts: true }
    },
    {
      id: 'congress_2',
      headline: "House passes 'Healthcare Freedom Act' - allows insurance exclusions for 'lifestyle diseases'",
      description: "Smoking, obesity, and 'preventable' cancers may no longer be covered",
      effects: { coverage: -20, hope: -15 }
    },
    {
      id: 'congress_3',
      headline: "Medicare negotiation powers stripped in midnight vote",
      description: "Drug companies can now charge whatever they want for cancer medications",
      effects: { drugCosts: true, hope: -10 }
    },
    {
      id: 'congress_4',
      headline: "Bipartisan agreement: Insurance companies can now retroactively deny claims",
      description: "'Claim clawback' provision allows insurers to recover payments up to 2 years later",
      effects: { coverage: -15, hope: -10 }
    },
    {
      id: 'congress_5',
      headline: "Patient advocacy groups labeled 'special interests' in new lobbying reform",
      description: "Cancer survivors banned from testifying before health committees",
      effects: { hope: -20 }
    },
    {
      id: 'congress_6',
      headline: "Medical bankruptcy protections weakened in new bill",
      description: "Hospital systems can now garnish wages directly without court order",
      effects: { hope: -15 }
    }
  ],

  // Insurance denial reasons
  denialReasons: [
    "Treatment deemed 'not medically necessary' by our review board",
    "Provider is out-of-network for this specific procedure",
    "Pre-authorization was not obtained within required timeframe",
    "Treatment exceeds 'reasonable and customary' cost limits",
    "Alternative treatments have not been exhausted",
    "Documentation submitted was incomplete (missing form 47-B)",
    "This treatment is considered 'experimental' by our standards",
    "Your condition was pre-existing and not disclosed at enrollment",
    "The facility fee exceeds our covered maximum",
    "Treatment frequency exceeds policy limits",
    "Referring physician is not in our approved network",
    "Claims submission deadline exceeded by 3 days",
    "This medication requires step therapy - try cheaper option first",
    "Medical necessity not established by peer review",
    "Service provided does not match diagnosis code",
    "Coverage terminated effective date prior to service",
    "Maximum lifetime benefit has been reached",
    "Duplicate claim - similar service billed within 30 days",
    "Procedure code bundling error - resubmit with corrected codes",
    "Out-of-network anesthesiologist used without prior approval"
  ],

  // Insurance events
  insuranceEvents: [
    {
      id: 'ins_1',
      type: 'insurance',
      title: 'Prior Authorization Denied',
      description: 'Your chemotherapy requires additional review. Estimated wait: 6-8 weeks.',
      effects: { hope: -15, time: -14 }
    },
    {
      id: 'ins_2',
      type: 'insurance',
      title: 'Out-of-Network Surprise',
      description: 'Your anesthesiologist was out-of-network. Additional charge: $12,400',
      effects: { hope: -10, bill: { description: 'Out-of-network anesthesiologist', amount: 12400 } }
    },
    {
      id: 'ins_3',
      type: 'insurance',
      title: 'Policy Update',
      description: 'Your plan no longer covers this class of chemotherapy drugs.',
      effects: { coverage: -20, hope: -15 }
    },
    {
      id: 'ins_4',
      type: 'insurance',
      title: 'Network Change',
      description: 'Your oncologist has left the UnitedHealth network. Find a new one.',
      effects: { hope: -20, time: -21, networkChange: 'provider-left' }
    },
    {
      id: 'ins_5',
      type: 'insurance',
      title: 'Deductible Reset',
      description: 'Happy New Year! Your $8,000 deductible has reset to $0.',
      effects: { hope: -25 }
    },
    {
      id: 'ins_6',
      type: 'insurance',
      title: 'Premium Increase',
      description: 'Due to your claims history, your premium is increasing 40% next month.',
      effects: { hope: -15, money: -400 }
    },
    {
      id: 'ins_7',
      type: 'insurance',
      title: 'Claim Clawback',
      description: 'UnitedHealth has determined a previous claim was paid in error. Please refund $3,200.',
      effects: { hope: -10, bill: { description: 'Claim clawback', amount: 3200 } }
    },
    {
      id: 'ins_8',
      type: 'insurance',
      title: 'Authorization Expired',
      description: 'Your surgery prior authorization expired. Please resubmit and wait 4-6 weeks.',
      effects: { hope: -20, time: -28 }
    }
  ],

  // Hospital events
  hospitalEvents: [
    {
      id: 'hosp_1',
      type: 'hospital',
      title: 'Appointment Cancelled',
      description: 'Your oncologist is attending a pharma conference in Hawaii. Reschedule in 3 weeks.',
      effects: { hope: -10, time: -21 }
    },
    {
      id: 'hosp_2',
      type: 'hospital',
      title: 'Facility Fee',
      description: 'Surprise! Hospital facility fee for your last visit: $3,400',
      effects: { bill: { description: 'Hospital facility fee', amount: 3400 } }
    },
    {
      id: 'hosp_3',
      type: 'hospital',
      title: 'Parking Charge',
      description: 'Hospital parking for chemo session: $47',
      effects: { money: -47 }
    },
    {
      id: 'hosp_4',
      type: 'hospital',
      title: 'Medication Substitution',
      description: 'The pharmacy substituted a generic. Your insurance won\u2019t cover the difference: $2,100',
      effects: { bill: { description: 'Medication substitution', amount: 2100 } }
    },
    {
      id: 'hosp_5',
      type: 'hospital',
      title: 'Lab Work Surprise',
      description: 'Your routine blood work was sent to an out-of-network lab. Charge: $4,800',
      effects: { bill: { description: 'Out-of-network lab work', amount: 4800 } }
    },
    {
      id: 'hosp_6',
      type: 'hospital',
      title: 'Treatment Delay',
      description: 'The infusion center is overbooked. Your chemo is pushed back 2 weeks.',
      effects: { hope: -10, time: -14, health: -5 }
    },
    {
      id: 'hosp_7',
      type: 'hospital',
      title: 'Specialist Referral Required',
      description: 'You need a referral to continue seeing your oncologist. Wait time: 4 weeks.',
      effects: { time: -28, hope: -10 }
    },
    {
      id: 'hosp_8',
      type: 'hospital',
      title: '$47 Aspirin',
      description: 'Itemized bill includes: Aspirin (1 tablet) - $47, Saline bag - $847',
      effects: { hope: -5 }
    }
  ],

  // Financial events
  financialEvents: [
    {
      type: 'financial',
      title: 'Collections Notice',
      description: 'Your hospital bill has been sent to collections. Credit score impact: -150 points.',
      effects: { hope: -20 }
    },
    {
      type: 'financial',
      title: 'Wage Garnishment',
      description: 'The hospital has begun garnishing your wages. 25% of each paycheck goes to them.',
      effects: { hope: -25, money: -500 }
    },
    {
      type: 'financial',
      title: 'GoFundMe Suggestion',
      description: 'Hospital billing dept suggests: "Have you tried asking strangers on the internet for money?"',
      effects: { hope: -15 }
    },
    {
      type: 'financial',
      title: 'Charity Care Denied',
      description: 'Your 47-page charity care application was denied. Reason: You own a car.',
      effects: { hope: -20 }
    },
    {
      type: 'financial',
      title: 'Medical Credit Card Offer',
      description: 'CareCredit offers you a card! 0% APR for 6 months, then 26.99% on full balance.',
      effects: { hope: -5 }
    },
    {
      type: 'financial',
      title: 'Job Loss',
      description: 'You\'ve missed too much work for treatment. Your position has been "eliminated."',
      effects: { hope: -30, coverage: -30 }
    }
  ],

  // Political events (major)
  politicalEvents: [
    {
      id: 'pol_1',
      type: 'political',
      title: 'ACA Marketplaces Defunded',
      description: 'Healthcare.gov enrollment period cancelled. Find insurance on your own.',
      effects: { coverage: -25, hope: -20, political: { acaStatus: 'repealed' } }
    },
    {
      id: 'pol_2',
      type: 'political',
      title: 'Pre-Existing Conditions Loophole',
      description: 'New rule allows insurers to charge 5x more for pre-existing conditions.',
      effects: { coverage: -20, hope: -15 }
    },
    {
      id: 'pol_3',
      type: 'political',
      title: 'Medicaid Block Grants',
      description: 'States now receive fixed funding. Your state cuts cancer coverage to balance budget.',
      effects: { coverage: -15, hope: -10 }
    }
  ],

  // Denial letter template
  denialLetterTemplate: `
IMPORTANT NOTICE REGARDING YOUR CLAIM

Date: {DATE}
Provider: {PROVIDER}
Member ID: ****1234

Dear Valued Customer,

Your claim for {TREATMENT} has been DENIED.

REASON FOR DENIAL:
{REASON}

You have the right to appeal this decision. To do so, you must submit Form 47-B, along with supporting documentation from your physician, by {APPEAL_DEADLINE}.

Please note that 73% of appeals are also denied. Average appeal processing time is 6-8 weeks.

If you have questions, please call our member services line. Average hold time: 47 minutes.

Thank you for being a valued {PROVIDER} member!

Sincerely,
Claims Review Department
(This letter was generated automatically. Do not reply.)
`,

  // Hospital bill items
  hospitalBillItems: [
    { name: 'Room charge (per day)', min: 3000, max: 6000 },
    { name: 'Physician services', min: 8000, max: 15000 },
    { name: 'Laboratory', min: 2000, max: 12000 },
    { name: 'Pharmacy', min: 1000, max: 20000 },
    { name: 'Facility fee', min: 2000, max: 5000 },
    { name: 'Imaging (CT/MRI)', min: 3000, max: 8000 },
    { name: 'Anesthesia', min: 2000, max: 8000 },
    { name: 'Surgical supplies', min: 1000, max: 5000 },
    { name: 'Recovery room', min: 1500, max: 4000 },
    { name: 'IV therapy', min: 500, max: 2000 },
    { name: 'Oxygen therapy', min: 200, max: 800 },
    { name: 'Wound care supplies', min: 100, max: 500 },
    { name: 'Miscellaneous', min: 500, max: 2000 }
  ],

  // Absurd line items
  absurdBillItems: [
    { name: 'Aspirin (1 tablet)', cost: 47 },
    { name: 'Saline bag (500ml)', cost: 847 },
    { name: 'Bandage (sterile)', cost: 142 },
    { name: 'Ibuprofen (200mg)', cost: 89 },
    { name: 'Tissue box', cost: 34 },
    { name: 'Plastic cup', cost: 18 },
    { name: 'Pillow (use of)', cost: 75 },
    { name: 'TV remote handling', cost: 45 },
    { name: 'Blanket warming', cost: 128 },
    { name: 'Nurse gloves (pair)', cost: 53 }
  ],

  // News ticker headlines
  tickerHeadlines: [
    "UnitedHealth CEO compensation rises to $23.5M amid record claim denials",
    "Study: 67% of bankruptcies in US are medical-related",
    "Pharmaceutical profits hit record high as patients ration insulin",
    "Hospital system reports 'excellent quarter' after closing rural facilities",
    "Insurance companies spend $800M lobbying against price caps",
    "GoFundMe now third-largest health insurer in United States",
    "Average ER wait time reaches 4 hours as hospitals cut staff",
    "Drug company raises cancer medication price 1,200% overnight",
    "Medical debt now affects 100 million Americans",
    "Insurance executive: 'Denials are a feature, not a bug'",
    "Brian Thompson memorial service disrupted by protesters",
    "Healthcare spending hits $4.5 trillion, outcomes remain worst in developed world",
    "New study: Uninsured cancer patients 3x more likely to die",
    "Hospital charges $39,000 for 30-minute ER visit, bandage",
    "Pharmacy benefit managers pocket billions in hidden fees"
  ],

  // Treatment options
  treatments: [
    {
      name: 'Chemotherapy (standard)',
      cost: 12000,
      sessions: 6,
      healthGain: 8,
      hopeCost: -5,
      timeCost: 7
    },
    {
      name: 'Chemotherapy (targeted)',
      cost: 45000,
      sessions: 6,
      healthGain: 12,
      hopeCost: -3,
      timeCost: 7
    },
    {
      name: 'Surgery (tumor removal)',
      cost: 85000,
      sessions: 1,
      healthGain: 25,
      hopeCost: -10,
      timeCost: 30
    },
    {
      name: 'Radiation therapy',
      cost: 35000,
      sessions: 20,
      healthGain: 6,
      hopeCost: -4,
      timeCost: 28
    },
    {
      name: 'Immunotherapy',
      cost: 150000,
      sessions: 12,
      healthGain: 15,
      hopeCost: -2,
      timeCost: 84
    }
  ],

  // Cancer types and stages
  cancerTypes: [
    { name: 'Lung', severity: 1.2, treatmentCostMultiplier: 1.0 },
    { name: 'Breast', severity: 0.9, treatmentCostMultiplier: 0.9 },
    { name: 'Colon', severity: 1.0, treatmentCostMultiplier: 1.0 },
    { name: 'Prostate', severity: 0.7, treatmentCostMultiplier: 0.8 },
    { name: 'Pancreatic', severity: 1.8, treatmentCostMultiplier: 1.3 },
    { name: 'Leukemia', severity: 1.3, treatmentCostMultiplier: 1.5 }
  ],

  // Difficulty presets
  difficulties: [
    {
      name: 'Employed (Full Benefits)',
      description: 'You have employer insurance with decent coverage. The game is still hard.',
      startingMoney: 35000,
      startingCoverage: 85,
      deductible: 6000,
      maxOOP: 12000
    },
    {
      name: 'Gig Worker',
      description: 'ACA marketplace plan. High deductible, narrow network.',
      startingMoney: 15000,
      startingCoverage: 65,
      deductible: 8500,
      maxOOP: 17000
    },
    {
      name: 'Uninsured',
      description: 'No coverage. Hospital charity care is your only hope. Good luck.',
      startingMoney: 8000,
      startingCoverage: 0,
      deductible: 0,
      maxOOP: 999999
    },
    {
      name: 'Medicare',
      description: 'You\'re 65+. Coverage is decent but being gutted by politicians.',
      startingMoney: 20000,
      startingCoverage: 75,
      deductible: 2000,
      maxOOP: 8000
    }
  ],

  // Endings
  endings: {
    remission_bankruptcy: {
      title: 'Remission + Bankruptcy',
      description: 'You beat cancer. But you lost your home, your savings, and your credit score. You\'ll spend the next decade rebuilding while hospital bills follow you.',
      color: '#FFD700'
    },
    death_by_denial: {
      title: 'Death by Denial',
      description: 'Insurance delays killed you. Your prior authorization was approved 3 days after your death. UnitedHealth sent a sympathy card.',
      color: '#8B0000'
    },
    medical_tourism: {
      title: 'Medical Tourism',
      description: 'You fled to Mexico for treatment at 1/10th the cost. It worked. You now tell everyone about the American healthcare system from your new home abroad.',
      color: '#4169E1'
    },
    american_dream: {
      title: 'The American Dream',
      description: 'A distant relative died and left you $500,000. You paid off your medical debt with money to spare. This happens to 0.1% of cancer patients.',
      color: '#00FF00'
    },
    activist: {
      title: 'The Activist',
      description: 'You survived and channeled your rage into healthcare advocacy. You now spend your remission fighting so others don\'t have to go through what you did.',
      color: '#9932CC'
    },
    system_wins: {
      title: 'The System Wins',
      description: 'You gave up. The forms, the denials, the bills, the calls - it was too much. You stopped fighting. The system was designed to make you give up, and it worked.',
      color: '#696969'
    },
    against_all_odds: {
      title: 'Against All Odds',
      description: 'You beat cancer AND kept your savings. How? You had perfect insurance, made no mistakes, and got incredibly lucky. This ending is nearly impossible.',
      color: '#00FFFF'
    },
    time_ran_out: {
      title: 'Time Ran Out',
      description: 'The cancer spread while you waited for prior authorizations. By the time treatment was approved, it was too late.',
      color: '#800000'
    }
  },

  // CEO quotes (for atmosphere)
  ceoQuotes: [
    { name: 'Andrew Witty', company: 'UnitedHealth', quote: "We're focused on improving the health system for everyone." },
    { name: 'Brian Thompson', company: 'UnitedHealthcare', quote: "Our mission is to help people live healthier lives.", note: '(1967-2024)' },
    { name: 'David Wichmann', company: 'UnitedHealth', quote: "Healthcare needs to be more affordable and accessible." },
    { name: 'Generic CEO', company: 'Anthem', quote: "We put our members first in everything we do." },
    { name: 'Generic CEO', company: 'Cigna', quote: "Our purpose is to improve the health and vitality of those we serve." }
  ]
};

export default ContentData;
