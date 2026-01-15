/**
 * ContentData.js - All game content and balance values
 * Centralized content for Lab Tycoon - Academic Survival Simulator
 */

export const ContentData = {
  // ==================== NEWS HEADLINES ====================
  newsHeadlines: [
    // RFK Jr / HHS themed
    'BREAKING: New HHS Secretary asks why vaccines have "so many ingredients"',
    'RFK Jr replaces CDC guidelines with healing crystal recommendations',
    'NIH now requires all studies cite at least one Joe Rogan episode',
    'HHS announces new department: "Wellness Through Intuition"',
    'FDA approval process replaced with "RFK Jr gut feeling" assessment',
    'New HHS policy: Scientists must prove Earth is round before funding',
    'RFK Jr questions why labs need "so many chemicals"',
    'CDC renames itself "Center for Doing Your Own Research"',
    'HHS mandates all clinical trials include essential oils control group',
    'New NIH director demands peer review by Facebook comment section',
    'RFK Jr unveils new food pyramid: Raw milk at every level',
    'HHS replaces medical journals with Substack subscriptions',
    'RFK Jr bans fluoride, recommends "natural tooth decay"',
    'New CDC guidance: "Have you tried NOT being sick?"',
    'HHS study links vaccines to everything, funded by whale.to',
    'RFK Jr appoints chiropractor as Surgeon General',
    'NIH grant now requires section on "what Big Pharma doesnt want you to know"',
    'RFK Jr demands labs stop using "chemicals" - scientists unsure how to respond',
    'HHS replaces medical textbooks with Joe Rogan clips',
    'RFK Jr questions why scientists "need" the scientific method',
    'New policy: All grant applications must be written in crayon',
    'Trump suggests scientists should "look into" why the sun is hot',
    'RFK Jr bans microscopes for "making things look scary"',
    'HHS: Measles outbreak is "natural immunity in action"',
    'President asks why we can\'t just "print more science"',
    'RFK Jr discovers water is a chemical, demands ban',
    'New CDC logo is just a picture of essential oils',
    'Trump tweets that gravity is "very unfair to tall people"',
    'HHS mandates all lab coats be red MAGA hats',
    'RFK Jr concerned that DNA has "too many letters"',
    'FDA replaced with panel of Facebook moms',
    'Trump demands Mount Rushmore include his face on the moon',
    'RFK Jr: "Why do we even need two lungs?"',
    'NIH Director now requires no science background (feature, not bug)',
    'President confused why lab mice don\'t vote Republican',
    'HHS bans peer review for being "elitist"',
    'RFK Jr discovers germs exist, immediately bans term',
    'New executive order: Pi is now exactly 3',
    'Trump suggests raking prevents lab fires',

    // Trump / political themed
    'President calls peer review "rigged" and "very unfair to me"',
    'White House: "Nobody knows more about science than the President"',
    'MAGA rally attendee nominated to lead National Science Foundation',
    'Congress defunds weather satellites for "reporting fake temperatures"',
    'New executive order: All research must Make America Great Again',
    'President suggests scientists "look into" injecting bleach (again)',
    'Federal judge rules "alternative facts" now admissible in peer review',
    'Science advisor position filled by MyPillow CEO',
    'White House science briefing replaced with campaign rally',
    'President demands scientists investigate windmill cancer',
    'EPA renamed "Extracting Profits Always" agency',
    'NOAA forbidden from using word "climate" in any reports',
    'President claims he "aced" a science test, "doctors were amazed"',
    'White House: "The scientists are saying tremendous things about me"',
    'Executive order classifies evolution as "just a theory, maybe wrong"',
    'President suggests nuking hurricanes, scientists "looking into it"',
    'FDA commissioner must pass loyalty test before confirmation',

    // Congress / politician themed
    'Marjorie Taylor Greene demands investigation into Jewish space lasers causing lab fires',
    'Congressman asks if we can "nuke" the coronavirus',
    'Senator brings snowball to hearing, declares climate change "debunked"',
    'Ted Cruz flees to Cancun during NIH funding crisis',
    'Lauren Boebert asks if DNA stands for "Dont Need Answers"',
    'Matt Gaetz questions why scientists need to be over 18',
    'Congressman confuses "peer review" with "Pier 1 Imports"',
    'Senate votes to replace scientific method with "common sense"',
    'House committee demands scientists explain "why research takes so long"',

    // General anti-science culture
    'Congress votes to replace lab mice with "thoughts and prayers"',
    'New study funded by "Do Your Own Research" Foundation inconclusive',
    'FDA approves medication based on influencer testimonials',

    // Academia dystopia - exploitation and suffering
    'University replaces tenure track with "passion-based compensation"',
    'PhD student enters 15th year, advisor says "almost ready to graduate"',
    'Postdoc celebrates 45th birthday, still listed as "early career researcher"',
    'Adjunct professor teaches 8 classes across 4 universities, earns $23,000',
    'University announces record $50B endowment, cuts adjunct pay by 10%',
    'Graduate student asked to "volunteer" for 60-hour work week',
    'Lab manager position requires PhD, 10 years experience, pays $35,000',
    'University president gets $2M bonus for "cost-saving measures" (layoffs)',
    'Postdoc discovers they make less than campus parking attendant',
    'PhD advisor on sabbatical for 3 years, student still waiting for feedback',
    'University builds $100M rec center, closes chemistry department',
    'Adjunct dies, university posts job listing same day at lower salary',
    'Graduate student union crushed, administration celebrates "dialogue"',
    'Professor emeritus volunteers to teach for free, displaces 3 adjuncts',
    'University offers "wellness webinar" instead of living wage',
    'PhD student works retail to fund research, advisor takes credit',
    'Tenure-track position gets 800 applicants, job goes to dean\'s nephew',
    'Lab tech with 20 years experience still classified as "temporary"',
    'University spends $500K on branding, freezes research budgets',
    'Postdoc insurance doesn\'t cover "pre-existing condition" (depression)',
    'Graduate student housing costs 90% of stipend, "market rate" according to admin',
    'Professor retires, position eliminated, courses taught by 5 adjuncts',
    'University startup incubator profits millions, student inventors get nothing',
    'Administration adds 50 new deans, wonders why overhead is 60%',
    'PhD student mental health crisis blamed on "poor time management"',
    'Lab celebrates 100th rejected grant application with sad pizza party',
    'Adjunct sleeps in car between teaching gigs at rival universities',
    'University Title IX office investigates grad student for "negativity"',
    'Postdoc asked to train replacement before being laid off',
    'Department votes to eliminate itself to save provost\'s office budget',
    'Graduate student told "PhD is a privilege" when asking about stipend',
    'University café charges researchers $15 for sad salad, calls it "amenity"',
    'Professor publishes 200th paper, still can\'t afford Bay Area apartment',
    'HR classifies 10-year postdoc as "not eligible for benefits"',

    // More academia dystopia - mental health & exploitation
    'Study finds 47% of graduate students meet clinical depression threshold, university cuts counseling',
    'Postdoc suicide rate rises, administration launches "gratitude journaling" initiative',
    'PhD student hospitalized for stress, advisor asks when they will be back in lab',
    'University wellness center wait time: 8 weeks. Qualifying exam: 2 weeks.',
    'Graduate student food insecurity hits 40%, university builds new $80M stadium',
    'Adjunct union vote fails after administration warns of "consequences"',
    'International PhD student works 80hr weeks: "If I quit, I get deported"',
    'Professor wins teaching award, position converted to adjunct next semester',
    'University cuts graduate health insurance, adds new Vice Provost of Wellbeing',
    'Postdoc publishes 15 papers, still "not competitive" for faculty position',
    'Two-body problem solved: both partners become adjuncts at different schools',
    'Department celebrates diversity by hiring white man who studied abroad once',
    'Graduate student told "PhD is not a job" when asking about minimum wage',
    'Lab PI takes 6-week vacation, students work through holidays to meet deadline',
    'University offers "mental health day" but counts it against sick leave',
    'Postdoc discovers PI listed themselves as first author on their paper',
    'Grad student told research "needs more work" enters 11th year of PhD',
    'University builds $20M meditation garden, adjuncts still not paid for office hours',
    'Faculty hiring freeze enters 15th year, administration expands 30%',
    'Student loan interest exceeds PhD stipend, "at least you are investing in yourself"',
    'Postdoc salary: $50K. Undergrad dorm director salary: $85K plus housing',
    'University brags about research breakthroughs, researchers remain undisclosed (unpaid)',
    'Adjunct applies for food stamps, disqualified due to "advanced degree"',
    'Graduate student told to "network more" after 200th rejected job application',
    'Lab meeting at 7am because PI "is most productive then"',
    'Postdoc negotiates raise, amount: $0, but "we appreciate your contribution"',

    // Even darker headlines
    'PhD student found living in lab storage closet, "at least rent is free"',
    'University wellness center overwhelmed, offers "group crying sessions"',
    'Adjunct professor obituary lists "finally got job security" as cause of peace',
    'Postdoc skeleton discovered at desk, advisor asks "but did they finish the paper?"',
    'Graduate student hasn\'t seen sunlight in 47 days, sets new department record',
    'University builds $30M fountain, grad students drink from it to save money',
    'Lab safety training now includes "what to do when you snap"',
    'PhD comic strip becomes horror genre, sales increase 400%',
    'Adjunct found frozen in car, university posts replacement job same afternoon',
    'Grad student applies for own advisor\'s job posting, gets rejected',
    'University chaplain exclusively counsels STEM grad students now',
    'New study: 94% of "I\'m fine" responses from grad students are lies',
    'Postdoc celebrates birthday alone in lab, PI sends email asking for more data',
    'Graduate student mental health crisis so common it\'s in orientation packet',
    'Lab manager hasn\'t smiled since 2019, coworkers don\'t remember what it looked like',
    'University offers mindfulness app instead of living wage, shocked when it doesn\'t help',
    'PhD student\'s thesis dedication: "To my mental health, which didn\'t survive this"',
    'Adjunct professor\'s LinkedIn: "Open to opportunities" for 6 consecutive years',
    'Postdoc dreams exclusively about failed experiments, therapist concerned',
    'Graduate student food pyramid: coffee, instant ramen, anxiety, regret',
    'University mandates "gratitude journaling" after 5th grad student breakdown this month',
    'New faculty orientation includes section on "not being like your advisor"',
    'Academic Twitter collectively spirals, water is also wet',
    'Department celebrates 0% turnover rate because nobody can afford to leave',
  ],

  // ==================== CRISIS EVENTS ====================
  crisisEvents: [
    {
      title: '🧪 RFK JR LAB INSPECTION',
      message: 'The HHS Secretary personally visits your lab and asks why you\'re using "synthetic chemicals" instead of "natural remedies."',
      effect: { funding: -15000 },
      responses: [
        { text: 'Explain Chemistry', result: 'He starts talking about thimerosal. You lose 3 hours. -$15,000' },
        { text: 'Offer Raw Milk', result: 'He\'s impressed but still cuts funding. -$15,000' }
      ]
    },
    {
      title: '🏛️ CONGRESSIONAL HEARING',
      message: 'Senator asks why you can\'t just "Google" the research instead of doing experiments.',
      effect: { funding: -5000 },
      responses: [
        { text: 'Explain Science', result: 'They weren\'t listening anyway. -$5,000' },
        { text: 'Agree Politely', result: 'Your dignity: -100%. Funding: Unchanged.' }
      ]
    },
    {
      title: '🎺 PRESIDENTIAL TWEET',
      message: 'The President tweets that your research is "FAKE SCIENCE" and "very unfair." 50M views.',
      effect: { funding: -20000, researchPoints: -30 },
      responses: [
        { text: 'Issue Statement', result: 'Nobody reads it. Funding slashed. -$20,000 -30 RP' },
        { text: 'Stay Silent', result: 'Interpreted as admission of guilt. -$20,000 -30 RP' }
      ]
    },
    {
      title: '📋 DOGE AUDIT',
      message: 'Elon Musk\'s "Department of Government Efficiency" flags your research as "wasteful spending."',
      effect: { funding: -25000 },
      responses: [
        { text: 'Appeal Decision', result: 'Appeal denied via Twitter meme. -$25,000' },
        { text: 'Accept Cuts', result: 'At least you still have a job. For now. -$25,000' }
      ]
    },
    {
      title: '💉 ANTI-VAX PROTEST',
      message: 'Protesters outside your lab demand you stop "poisoning children" with your cancer research.',
      effect: { researchPoints: -40 },
      responses: [
        { text: 'Engage Peacefully', result: 'They post your face on InfoWars. -40 RP' },
        { text: 'Call Security', result: 'Fox News reports you\'re "silencing free speech." -40 RP' }
      ]
    },
    {
      title: '🌡️ CLIMATE DENIAL MANDATE',
      message: 'New federal policy requires removing "climate change" from all grant applications.',
      effect: { researchPoints: -50 },
      responses: [
        { text: 'Comply', result: 'Your atmospheric research is now about "weather patterns." -50 RP' },
        { text: 'Refuse', result: 'Grant application automatically rejected. -50 RP' }
      ]
    },
    {
      title: '📺 FOX NEWS SEGMENT',
      message: 'Tucker Carlson successor asks "Why are taxpayers funding this?" about your NIH grant.',
      effect: { funding: -12000 },
      responses: [
        { text: 'Go On Show', result: 'Edited to look insane. Funding cut. -$12,000' },
        { text: 'Decline Interview', result: '"Scientists REFUSE to answer questions!" -$12,000' }
      ]
    },
    {
      title: '🧬 EVOLUTION CONTROVERSY',
      message: 'State legislature demands your genetics research include "alternative theories of creation."',
      effect: { researchPoints: -35 },
      responses: [
        { text: 'Add Disclaimer', result: '"Evolution is just a theory" now on all papers. -35 RP' },
        { text: 'Stand Firm', result: 'State funding eliminated. -35 RP' }
      ]
    },
    {
      title: '💊 IVERMECTIN MANDATE',
      message: 'New HHS guidance suggests your clinical trial should include ivermectin arm.',
      effect: { funding: -8000, researchPoints: -25 },
      responses: [
        { text: 'Add Ivermectin Arm', result: 'Your study is now scientifically compromised. -$8,000 -25 RP' },
        { text: 'Refuse', result: 'Grant renewal denied. -$8,000 -25 RP' }
      ]
    },
    {
      title: '🔬 EQUIPMENT SEIZED',
      message: 'FBI raid looking for "evidence of gain-of-function research" takes your centrifuge.',
      effect: { funding: -10000 },
      responses: [
        { text: 'Cooperate Fully', result: 'Equipment returned in 18 months, broken. -$10,000' },
        { text: 'Lawyer Up', result: 'Legal fees exceed equipment value. -$10,000' }
      ]
    },
    {
      title: '📱 VIRAL CONSPIRACY',
      message: 'Your research is featured in a viral TikTok claiming it causes 5G mind control.',
      effect: { funding: -6000, researchPoints: -20 },
      responses: [
        { text: 'Make Response Video', result: 'Dueted with clown music. -$6,000 -20 RP' },
        { text: 'Report Video', result: 'Streisand effect. 10M more views. -$6,000 -20 RP' }
      ]
    },
    {
      title: '🎓 LOYALTY OATH',
      message: 'New federal policy requires scientists to sign pledge that "America has the best science."',
      effect: { researchPoints: -15 },
      responses: [
        { text: 'Sign It', result: 'International collaborators stop returning emails. -15 RP' },
        { text: 'Refuse', result: 'Security clearance revoked. -15 RP' }
      ]
    },
    // Academia dystopia crisis events
    {
      title: '💀 ADVISOR ABANDONMENT',
      message: 'Your PhD advisor takes a job at another university. You\'re not invited. 5 years of work orphaned.',
      effect: { researchPoints: -60 },
      responses: [
        { text: 'Find New Advisor', result: 'New advisor wants you to start over. -60 RP' },
        { text: 'Follow Them', result: 'They "don\'t have space." You\'re homeless academically. -60 RP' }
      ]
    },
    {
      title: '🏚️ STIPEND "ADJUSTMENT"',
      message: 'University announces 0% stipend increase for 5th year running. Rent increased 15%.',
      effect: { funding: -3000 },
      responses: [
        { text: 'Get Second Job', result: 'Advisor angry you\'re not in lab 80hrs/week. -$3,000' },
        { text: 'Food Bank', result: 'At least the sad pizza is free. -$3,000' }
      ]
    },
    {
      title: '📚 SCOOPED',
      message: 'A lab in China published your exact research 2 days before your submission. 3 years wasted.',
      effect: { researchPoints: -80 },
      responses: [
        { text: 'Pivot Research', result: 'Another 2 years added to PhD. -80 RP' },
        { text: 'Publish Anyway', result: 'Rejected as "not novel." -80 RP' }
      ]
    },
    {
      title: '🎭 IMPOSTER SYNDROME ATTACK',
      message: 'You realize everyone at the conference actually knows what they\'re doing. Unlike you.',
      effect: { researchPoints: -25 },
      responses: [
        { text: 'Hide in Bathroom', result: 'Missed the only useful talk. -25 RP' },
        { text: 'Fake Confidence', result: 'Someone asks a question you can\'t answer. -25 RP' }
      ]
    },
    {
      title: '🔥 BURNOUT SPIRAL',
      message: 'Your best postdoc hasn\'t slept in 72 hours. They\'re crying in the cold room.',
      effect: { researchPoints: -40 },
      responses: [
        { text: 'Suggest Therapy', result: 'Insurance doesn\'t cover it. They quit. -40 RP' },
        { text: 'Give Time Off', result: 'Experiments fail without them. -40 RP' }
      ]
    },
    {
      title: '📉 TENURE DENIAL',
      message: 'After 7 years, you\'re denied tenure. Reason: "Not enough Nature papers." You have 3.',
      effect: { funding: -30000, researchPoints: -100 },
      responses: [
        { text: 'Appeal', result: 'Committee doesn\'t meet for 18 months. -$30,000 -100 RP' },
        { text: 'Leave Academia', result: 'Industry salary is 3x. Why did you wait? -$30,000 -100 RP' }
      ]
    },
    {
      title: '🏛️ ADMINISTRATIVE BLOAT',
      message: 'University hires 10 new Associate Vice Provosts. Lab budgets cut to compensate.',
      effect: { funding: -20000 },
      responses: [
        { text: 'Attend Town Hall', result: 'They serve stale cookies. Budget still cut. -$20,000' },
        { text: 'Write Op-Ed', result: 'Marked as "troublemaker." -$20,000' }
      ]
    },
    {
      title: '💔 RELATIONSHIP COLLAPSE',
      message: 'Your partner leaves because you\'re "married to the lab." They\'re not wrong.',
      effect: { researchPoints: -30 },
      responses: [
        { text: 'Focus on Work', result: 'Productivity drops anyway. -30 RP' },
        { text: 'Take Time Off', result: 'Advisor asks "is this really necessary?" -30 RP' }
      ]
    },
    {
      title: '🎓 GRADUATION POSTPONED',
      message: 'Committee member wants "one more experiment." This is the 5th time.',
      effect: { researchPoints: -35 },
      responses: [
        { text: 'Do Experiment', result: '6 months later, they want another. -35 RP' },
        { text: 'Push Back', result: 'Marked as "difficult." -35 RP' }
      ]
    },
    {
      title: '📧 REVIEWER 2 STRIKES',
      message: 'Reviewer demands you cite their 47 papers and "completely restructure" the manuscript.',
      effect: { researchPoints: -20 },
      responses: [
        { text: 'Comply', result: 'Paper now unreadable. Still rejected. -20 RP' },
        { text: 'Rebut', result: 'Reviewer gets angry. Rejected with prejudice. -20 RP' }
      ]
    },
    {
      title: '🏥 HEALTH CRISIS',
      message: 'You need surgery but can\'t take time off or you\'ll lose your grant.',
      effect: { funding: -5000, researchPoints: -25 },
      responses: [
        { text: 'Delay Surgery', result: 'Condition worsens. -$5,000 -25 RP' },
        { text: 'Take Leave', result: 'Experiments ruined. Grant not renewed. -$5,000 -25 RP' }
      ]
    },
    {
      title: '👶 PARENTAL PENALTY',
      message: 'You had a baby. Tenure clock doesn\'t stop. "Everyone has challenges."',
      effect: { researchPoints: -45 },
      responses: [
        { text: 'Work Through It', result: 'Sleep deprivation destroys productivity. -45 RP' },
        { text: 'Request Extension', result: 'Denied. "Not standard practice." -45 RP' }
      ]
    },
    // More RFK Jr / Trump dark political humor
    {
      title: '🧠 RFK JR BRAIN WORM SEMINAR',
      message: 'RFK Jr visits to give mandatory seminar on "parasites as alternative medicine." Attendance required for funding.',
      effect: { researchPoints: -30, funding: -5000 },
      responses: [
        { text: 'Attend Politely', result: 'You learn nothing. Brain cells die. -30 RP -$5,000' },
        { text: 'Ask Questions', result: 'Flagged as "hostile to wellness." -30 RP -$5,000' }
      ]
    },
    {
      title: '🥛 RAW MILK MANDATE',
      message: 'New HHS policy requires all lab refrigerators stock unpasteurized milk. Your cultures are contaminated.',
      effect: { researchPoints: -50, funding: -8000 },
      responses: [
        { text: 'Comply', result: 'E. coli outbreak in lab. -50 RP -$8,000' },
        { text: 'Hide Pasteurized', result: 'Caught. "Anti-freedom" label applied. -50 RP -$8,000' }
      ]
    },
    {
      title: '🎪 TRUMP RALLY REQUIREMENT',
      message: 'Federal scientists required to attend rally to show "unity." Your grant depends on it.',
      effect: { funding: -10000 },
      responses: [
        { text: 'Attend Rally', result: 'Seen on camera. International collaborators cut ties. -$10,000' },
        { text: 'Call In Sick', result: 'Admin knows you lied. Grant "under review." -$10,000' }
      ]
    },
    {
      title: '💉 VACCINE BAN',
      message: 'RFK Jr bans your lab from using any "experimental injections" including... pipette tips?',
      effect: { researchPoints: -60 },
      responses: [
        { text: 'Explain Pipettes', result: 'He doesn\'t care. The word "tip" sounds suspicious. -60 RP' },
        { text: 'Use Straws', result: 'Research quality plummets. -60 RP' }
      ]
    },
    {
      title: '📺 INFOWARS FEATURE',
      message: 'Alex Jones did a segment claiming your research is "turning the frogs gay." Again.',
      effect: { funding: -12000, researchPoints: -25 },
      responses: [
        { text: 'Issue Correction', result: 'Nobody reads it. Death threats increase. -$12,000 -25 RP' },
        { text: 'Go On Show', result: 'Edited into confession. Career over. -$12,000 -25 RP' }
      ]
    },
    {
      title: '🤡 SURGEON GENERAL VISIT',
      message: 'The new Surgeon General (a chiropractor) wants to "adjust" your research methodology.',
      effect: { researchPoints: -35 },
      responses: [
        { text: 'Accept Adjustment', result: 'Your spine is fine. Your data is not. -35 RP' },
        { text: 'Politely Decline', result: 'Reported to "Medical Freedom Board." -35 RP' }
      ]
    },
    {
      title: '🔮 CRYSTAL HEALING INTEGRATION',
      message: 'New HHS grant requirement: all studies must include "vibrational healing" comparison arm.',
      effect: { funding: -15000 },
      responses: [
        { text: 'Add Crystal Arm', result: 'IRB confused but approves. Data meaningless. -$15,000' },
        { text: 'Refuse', result: 'Grant terminated. Crystals win. -$15,000' }
      ]
    },
    {
      title: '🐴 IVERMECTIN AUDIT',
      message: 'HHS auditors demand to know why your cancer lab doesn\'t stock horse dewormer.',
      effect: { funding: -8000 },
      responses: [
        { text: 'Buy Ivermectin', result: 'Auditors satisfied. Veterinarians confused. -$8,000' },
        { text: 'Explain Oncology', result: '"That\'s what Big Pharma wants you to think." -$8,000' }
      ]
    },
    // Even darker academic crisis
    {
      title: '💀 THE CLOSET DWELLER',
      message: 'You discover a grad student has been secretly living in the supply closet for 3 months.',
      effect: { funding: -2000 },
      responses: [
        { text: 'Report to Housing', result: 'Student leaves. Lab loses best pipetter. -$2,000' },
        { text: 'Pretend You Didn\'t See', result: 'Others start moving in too. -$2,000' }
      ]
    },
    {
      title: '🎭 MASS BREAKDOWN',
      message: 'Three grad students crying in the bathroom simultaneously. There\'s a queue forming.',
      effect: { researchPoints: -50 },
      responses: [
        { text: 'Order Pizza', result: 'They cry harder. Pizza reminds them of sad seminars. -50 RP' },
        { text: 'Suggest Therapy', result: '"I can\'t afford it." x3. -50 RP' }
      ]
    },
    {
      title: '🔥 LAB FIRE',
      message: 'Small fire in the lab. Good news: nobody hurt. Bad news: 3 years of samples are ash.',
      effect: { researchPoints: -80, funding: -10000 },
      responses: [
        { text: 'Start Over', result: '3 years of work. Gone. -80 RP -$10,000' },
        { text: 'Cry', result: 'Appropriate response. Still -80 RP -$10,000' }
      ]
    }
  ],

  // ==================== GRANT AGENCIES ====================
  grantAgencies: [
    { name: 'NIH (Now Incredibly Hindered)', successRate: 0.08, maxAmount: 50000 },
    { name: 'NSF (No Science Funding)', successRate: 0.05, maxAmount: 30000 },
    { name: 'RFK Jr Wellness Foundation', successRate: 0.25, maxAmount: 10000 },
    { name: 'MAGA Science Initiative', successRate: 0.30, maxAmount: 15000 },
    { name: 'MyPillow Research Grant', successRate: 0.15, maxAmount: 5000 },
    { name: 'Ivermectin Studies Fund', successRate: 0.40, maxAmount: 8000 },
    { name: 'Big Pharma (Strings Attached LLC)', successRate: 0.20, maxAmount: 200000 },
    { name: 'Tech Billionaire Whim Fund', successRate: 0.01, maxAmount: 1000000 },
    { name: 'State Government (LOL)', successRate: 0.02, maxAmount: 10000 },
    { name: 'Elon Musk "Interesting" Grant', successRate: 0.005, maxAmount: 500000 },
    { name: 'Joe Rogan Experience Foundation', successRate: 0.20, maxAmount: 25000 },
    { name: 'InfoWars Truth Research Fund', successRate: 0.35, maxAmount: 5000 },
  ],

  // ==================== REJECTION REASONS ====================
  rejectionReasons: [
    'Not innovative enough (too likely to work)',
    'Too innovative (might not work)',
    'RFK Jr had "concerns" (no specifics)',
    'Budget too high (any amount is too high now)',
    'Research not "America First" enough',
    'Too preliminary (need results to get funding for results)',
    'Reviewer watched a YouTube video that disagreed',
    'Not aligned with administration priorities (Making America Great)',
    'Similar to project defunded last week',
    'PI follows scientists on Twitter who criticized the President',
    'PI too junior (needs more grants to get grants)',
    'Contains the word "climate" (automatic rejection)',
    'Reviewer didn\'t read past page 2',
    'Doesn\'t include ivermectin control group',
    'Reviewer is competitor, found "methodological concerns"',
    'Research might make America look bad internationally',
    'PI refused to sign loyalty oath',
    'Study design "too scientific" for current leadership',
    'Facebook commenters expressed concern',
    'Project flagged by DOGE as "wasteful"',
    'Research doesn\'t align with "common sense"',
    'PI has not appeared on Joe Rogan podcast',
    'PI cited their own work, deemed "self-promotional"',
    'Research too interdisciplinary (makes reviewers uncomfortable)',
    'Study design requires actual funding to execute',
    'Broader impacts section insufficiently performative',
    'PI has not graduated enough PhDs (to poverty)',
    'Research area "not hot anymore" per reviewer who works in competing area',
    'Preliminary data both too preliminary and not preliminary enough',
    'PI mentioned work-life balance in interview, shows "lack of commitment"',
    'Grant requires salary for postdoc, "can\'t they just volunteer?"',
    'PI did not include dean\'s nephew as co-investigator',
    'Research might help people but doesn\'t generate IP',
    'Study timeline "optimistic" (3 years to do 5 years of work)',
    'PI has fewer than 10,000 Twitter followers',
    'Reviewer personally dislikes PI from conference in 2007',
    'Too similar to PI\'s previous funded work (which was successful)',
    'Institution overhead rate too high (65% "standard")',
  ],

  // ==================== MILESTONE MESSAGES ====================
  milestoneMessages: {
    firstBurnout: 'Achievement Unlocked: First trainee burnout! They\'ll be fine... probably.',
    tenBurnouts: 'Veteran PI: 10 trainees have "moved on to other opportunities"',
    firstPaper: 'Published! Impact factor: 0.3. But it\'s something!',
    bigGrant: 'Major grant funded! Quick, before they change their minds!',
    labExpansion: 'New space acquired! (Converted broom closet, no windows)',
    equipmentMilestone: 'Full lab setup! Until the next DOGE audit.',
    survivedAudit: 'Survived federal audit! Only lost 60% of funding!',
    tweetSurvival: 'Research survived Presidential tweet! Barely.',
    firstRejection: 'First paper rejected! Only 50 more revisions to go!',
    hundredRejections: 'Century Club: 100 rejections! Most are from Reviewer 2.',
    adjunctHired: 'Hired your first adjunct! Paying poverty wages builds character.',
    phdGraduated: 'PhD graduated! Time to see them struggle on the job market.',
    firstCrying: 'Achievement: First grad student crying in your office!',
    foodBankVisit: 'Budget so tight you found the campus food bank!',
    tenYearPostdoc: 'A postdoc just hit 10 years! Still "training."',
    advisor404: 'Your advisor ghosted you! An authentic academic experience.',
    imposterUnlocked: 'Imposter syndrome fully active! Just like real academia!',
    loanDefault: 'Student loans in default! The PhD experience is complete.',
  },

  // ==================== SCIENTIST TYPES ====================
  scientistTypes: {
    biologist: { name: 'Biologist', color: 0x4ecdc4 },
    chemist: { name: 'Chemist', color: 0xff6b6b },
    physicist: { name: 'Physicist', color: 0xffd93d },
    engineer: { name: 'Engineer', color: 0x95e1d3 }
  },

  // ==================== SCIENTIST NAMES ====================
  scientistNames: {
    biologist: [
      'Dr. Charles Darwin', 'Dr. Gregor Mendel', 'Dr. Rosalind Franklin', 'Dr. Barbara McClintock',
      'Dr. James Watson', 'Dr. Francis Crick', 'Dr. Jennifer Doudna', 'Dr. Craig Venter',
      'Dr. Jane Goodall', 'Dr. Rachel Carson', 'Dr. Louis Pasteur', 'Dr. Alexander Fleming',
      'Dr. Carl Linnaeus', 'Dr. Ernst Mayr', 'Dr. E.O. Wilson', 'Dr. Sydney Brenner',
      'Dr. Emmanuelle Charpentier', 'Dr. Tu Youyou', 'Dr. Katalin Karikó', 'Dr. Shinya Yamanaka'
    ],
    chemist: [
      'Dr. Marie Curie', 'Dr. Linus Pauling', 'Dr. Dorothy Hodgkin', 'Dr. Antoine Lavoisier',
      'Dr. Dmitri Mendeleev', 'Dr. Robert Boyle', 'Dr. Carolyn Bertozzi', 'Dr. Ahmed Zewail',
      'Dr. Michael Faraday', 'Dr. Alfred Nobel', 'Dr. Fritz Haber', 'Dr. Glenn Seaborg',
      'Dr. Irène Joliot-Curie', 'Dr. Ada Yonath', 'Dr. Frances Arnold', 'Dr. Gertrude Elion',
      'Dr. Frederick Sanger', 'Dr. John Dalton', 'Dr. K. Barry Sharpless'
    ],
    physicist: [
      'Dr. Albert Einstein', 'Dr. Isaac Newton', 'Dr. Richard Feynman', 'Dr. Stephen Hawking',
      'Dr. Niels Bohr', 'Dr. Werner Heisenberg', 'Dr. Chien-Shiung Wu', 'Dr. Max Planck',
      'Dr. Erwin Schrödinger', 'Dr. Paul Dirac', 'Dr. Enrico Fermi', 'Dr. Murray Gell-Mann',
      'Dr. Donna Strickland', 'Dr. Andrea Ghez', 'Dr. Jocelyn Bell Burnell', 'Dr. Lise Meitner',
      'Dr. John Bardeen', 'Dr. Ernest Rutherford', 'Dr. J. Robert Oppenheimer', 'Dr. Kip Thorne'
    ],
    engineer: [
      'Dr. Nikola Tesla', 'Dr. Grace Hopper', 'Dr. Alan Turing', 'Dr. Claude Shannon',
      'Dr. Wernher von Braun', 'Dr. Katherine Johnson', 'Dr. Tim Berners-Lee', 'Dr. Vint Cerf',
      'Dr. Margaret Hamilton', 'Dr. Hedy Lamarr', 'Dr. John von Neumann', 'Dr. Dennis Ritchie',
      'Dr. Ada Lovelace', 'Dr. Charles Babbage', 'Dr. James Watt', 'Dr. Robert Noyce',
      'Dr. Gordon Moore', 'Dr. Fei-Fei Li', 'Dr. Geoffrey Hinton', 'Dr. Demis Hassabis'
    ]
  },

  // ==================== SCIENTIST TRAITS ====================
  scientistTraits: [
    // "Positive" traits (survival mechanisms)
    { name: 'Night Owl', effect: 'speedBonus', value: 0.2, desc: '+20% speed (sleeps under desk)', icon: '🦉' },
    { name: 'Perfectionist', effect: 'qualityBonus', value: 0.3, desc: '+30% success (endless revisions)', icon: '✨' },
    { name: 'Quick Learner', effect: 'xpBonus', value: 0.5, desc: '+50% XP (reads papers during lunch)', icon: '📚' },
    { name: 'Lucky', effect: 'luckBonus', value: 0.25, desc: '+25% luck (knows a reviewer)', icon: '🍀' },
    { name: 'Efficient', effect: 'speedBonus', value: 0.15, desc: '+15% speed (skips meetings)', icon: '⚡' },
    { name: 'Genius', effect: 'intelligenceBonus', value: 0.25, desc: '+25% INT (insufferable at parties)', icon: '🧠' },
    { name: 'Grant Whisperer', effect: 'fundingBonus', value: 0.2, desc: 'Uses correct buzzwords', icon: '💰' },
    { name: 'Coffee Immune', effect: 'speedBonus', value: 0.1, desc: 'Functional at 3AM', icon: '☕' },

    // Exploitation traits
    { name: 'Adjunct Brain', effect: 'costReduction', value: 0.5, desc: 'Accepts poverty wages', icon: '💸' },
    { name: 'Visa Hostage', effect: 'retention', value: 0.9, desc: 'Cannot leave (legally)', icon: '🛂' },
    { name: 'Sunk Cost', effect: 'retention', value: 0.8, desc: '10 years in, cannot quit now', icon: '⛓️' },
    { name: 'Passion Exploited', effect: 'costReduction', value: 0.3, desc: '"Does it for the science"', icon: '❤️' },

    // Mental health dystopia
    { name: 'Imposter', effect: 'qualityBonus', value: -0.1, desc: 'Thinks everyone else is smarter', icon: '🎭' },
    { name: 'Burnout Resistant', effect: 'stressCap', value: 0.7, desc: 'Already dead inside', icon: '🔥' },
    { name: 'Anxiety Engine', effect: 'speedBonus', value: 0.25, desc: 'Fear is a great motivator', icon: '😰' },
    { name: 'Dissociated', effect: 'stressCoping', value: 0.5, desc: 'Emotionally detached (coping)', icon: '👻' },

    // Coping mechanisms
    { name: 'Functional Alcoholic', effect: 'stressCoping', value: 0.3, desc: 'Wine after every rejection', icon: '🍷' },
    { name: 'Gym Bro', effect: 'stressCoping', value: 0.4, desc: 'Lifts instead of crying', icon: '💪' },
    { name: 'Therapy Veteran', effect: 'stressCoping', value: 0.5, desc: '$200/week well spent', icon: '🛋️' },
    { name: 'Car Sleeper', effect: 'costReduction', value: 0.4, desc: 'Rent costs more than stipend', icon: '🚗' },

    // Career delusion
    { name: 'Tenure Track', effect: 'moraleBonus', value: 0.3, desc: 'Still has hope (somehow)', icon: '🌟' },
    { name: 'Delusional', effect: 'hopePersist', value: 0.5, desc: 'Thinks they will get a faculty job', icon: '🤡' },
    { name: 'Industry Backup', effect: 'stressResist', value: 0.25, desc: 'Pharma recruiter on speed dial', icon: '🏭' },
    { name: 'Alt-Ac Curious', effect: 'flightRisk', value: 0.3, desc: 'Googles "leaving academia" weekly', icon: '🚪' },

    // Toxic productivity
    { name: 'Reviewer #3', effect: 'qualityBonus', value: -0.15, desc: 'Rejects own papers by habit', icon: '❌' },
    { name: 'Conference Addict', effect: 'luckBonus', value: 0.15, desc: 'Networking is their cardio', icon: '✈️' },
    { name: 'Email at 2AM', effect: 'speedBonus', value: 0.15, desc: 'No work-life boundary', icon: '📧' },
    { name: 'Workaholic', effect: 'speedBonus', value: 0.3, desc: 'Lab is their only home', icon: '🏠' },

    // Food insecurity
    { name: 'Food Bank Regular', effect: 'costReduction', value: 0.35, desc: 'PhD + SNAP benefits', icon: '📦' },
    { name: 'Free Pizza Hunter', effect: 'costReduction', value: 0.2, desc: 'Attends every seminar for food', icon: '🍕' },
    { name: 'Ramen Connoisseur', effect: 'costReduction', value: 0.25, desc: '$0.20/meal diet', icon: '🍜' }
  ],

  // ==================== ACADEMIA WORKER TYPES ====================
  academiaWorkerTypes: [
    {
      type: 'undergrad',
      title: 'Undergraduate Researcher',
      description: '"Gains valuable experience" (unpaid labor)',
      stipend: 0,
      workHours: '10-20 hrs/week (officially)',
      realHours: 25,
      productivity: 0.3,
      stressRate: 0.5,
      duration: '1-2 semesters',
      color: 0x4ecdc4,
      darkQuote: '"This will look great on grad school apps!" - You, lying'
    },
    {
      type: 'masters',
      title: 'Master\'s Student',
      description: 'Pays $60K tuition to pipette for you',
      stipend: 0,
      workHours: '20 hrs/week (in theory)',
      realHours: 35,
      productivity: 0.5,
      stressRate: 0.7,
      duration: '2 years of debt',
      color: 0x95e1d3,
      darkQuote: '"At least it\'s not a PhD" - Coping mechanism'
    },
    {
      type: 'phd',
      title: 'PhD Candidate',
      description: '6-8 years of "training" below poverty line',
      stipend: 2500,
      workHours: '40 hrs/week (LOL)',
      realHours: 65,
      productivity: 0.8,
      stressRate: 1.0,
      duration: '6-8 years (median)',
      color: 0xffd93d,
      darkQuote: '"I\'ll finish next year" - Said every year since 2019'
    },
    {
      type: 'postdoc',
      title: 'Postdoctoral Fellow',
      description: 'PhD + 5 years exp = less than Costco cashier',
      stipend: 4500,
      workHours: 'All of them',
      realHours: 70,
      productivity: 1.0,
      stressRate: 1.2,
      duration: '2-6 years (career purgatory)',
      color: 0xff6b6b,
      darkQuote: '"Any day now a faculty position will open" - Age 42'
    },
    {
      type: 'adjunct',
      title: 'Adjunct Professor',
      description: 'PhD teaching 4 classes for $3K each, no benefits',
      stipend: 1000,
      workHours: 'Per course (x4 courses)',
      realHours: 50,
      productivity: 0.6,
      stressRate: 1.5,
      duration: 'Semester to semester',
      color: 0xa55eea,
      darkQuote: '"At least I\'m still in academia" - From their car'
    },
    {
      type: 'visiting',
      title: 'Visiting Scholar',
      description: 'Works for visa status, university pays nothing',
      stipend: 0,
      workHours: 'Whatever keeps visa valid',
      realHours: 55,
      productivity: 0.9,
      stressRate: 1.3,
      duration: 'Until visa expires',
      color: 0x6ecfcf,
      darkQuote: '"If I leave, I get deported" - Leverage, academic style'
    }
  ],

  // ==================== ACADEMIA WORKER TRAITS ====================
  academiaTraits: [
    // Mental health dystopia
    { name: 'Imposter Syndrome', effect: 'stressBonus', value: 0.3, desc: '+30% stress gain', icon: '😰' },
    { name: 'Stockholm Syndrome', effect: 'loyaltyBonus', value: 0.5, desc: 'Thinks abuse is mentorship', icon: '🙃' },
    { name: 'Anxiety Spiral', effect: 'stressBonus', value: 0.5, desc: 'Every email triggers panic', icon: '😱' },
    { name: 'Depression (Untreated)', effect: 'productivityPenalty', value: -0.2, desc: 'Insurance doesn\'t cover therapy', icon: '🌑' },
    { name: 'Dissociation Expert', effect: 'stressResist', value: 0.3, desc: 'Has learned to feel nothing', icon: '😶' },

    // Exploitation traits
    { name: 'Can\'t Say No', effect: 'exploitBonus', value: 0.5, desc: 'Will work weekends if asked', icon: '😅' },
    { name: 'Workaholic', effect: 'hoursBonus', value: 0.5, desc: 'Lab is only identity left', icon: '💀' },
    { name: 'Perfectionist', effect: 'qualityBonus', value: 0.3, desc: 'Never publishes (not good enough)', icon: '✨' },
    { name: 'Savior Complex', effect: 'overtimeBonus', value: 0.4, desc: '"If I don\'t do it, no one will"', icon: '🦸' },

    // Survival traits
    { name: 'Ramen Budget', effect: 'costReduction', value: 0.3, desc: 'Hasn\'t eaten vegetables in months', icon: '🍜' },
    { name: 'Car Sleeper', effect: 'costReduction', value: 0.5, desc: 'Rent > Stipend', icon: '🚗' },
    { name: 'Food Bank Regular', effect: 'costReduction', value: 0.4, desc: 'PhD + SNAP benefits', icon: '📦' },
    { name: 'Side Hustle', effect: 'distraction', value: 0.2, desc: 'Drives Uber between experiments', icon: '🚕' },

    // Coping mechanisms
    { name: 'Coffee Addict', effect: 'caffeineBonus', value: 0.4, desc: '8 cups/day minimum', icon: '☕' },
    { name: 'Functioning Alcoholic', effect: 'stressCoping', value: 0.3, desc: 'Wine after every rejection', icon: '🍷' },
    { name: 'Doom Scroller', effect: 'procrastination', value: 0.3, desc: 'Reads Twitter instead of papers', icon: '📱' },
    { name: 'Emotional Eater', effect: 'stressCoping', value: 0.2, desc: 'Stress = vending machine', icon: '🍫' },

    // Career delusion
    { name: 'Eternal Optimist', effect: 'hopeDecay', value: -0.2, desc: 'Still believes tenure exists', icon: '🌈' },
    { name: 'Sunk Cost Prisoner', effect: 'retention', value: 0.9, desc: '"8 years in, can\'t quit now"', icon: '⛓️' },
    { name: 'Industry Curious', effect: 'flightRisk', value: 0.4, desc: 'Has LinkedIn open in another tab', icon: '🚪' },
    { name: 'Delusional', effect: 'hopePersist', value: 0.5, desc: 'Thinks they\'ll get that faculty job', icon: '🤡' },

    // Toxic productivity
    { name: 'Night Owl', effect: 'nightBonus', value: 0.3, desc: 'Best ideas at 3 AM (worst decisions too)', icon: '🦉' },
    { name: 'Weekend Warrior', effect: 'weekendWork', value: 0.4, desc: 'What\'s a "day off"?', icon: '📅' },
    { name: 'Vacation Guilt', effect: 'noTimeOff', value: 0.5, desc: 'Takes laptop on honeymoon', icon: '🏖️' },
    { name: 'Email Addiction', effect: 'alwaysOn', value: 0.3, desc: 'Checks inbox at 2 AM, 4 AM, 6 AM...', icon: '📧' }
  ],

  // ==================== EQUIPMENT DATA ====================
  equipmentTypes: {
    microscope: { name: 'Microscope', cost: 5000, baseProduction: 1.0 },
    centrifuge: { name: 'Centrifuge', cost: 8000, baseProduction: 1.5 },
    computer: { name: 'Computer', cost: 3000, baseProduction: 0.8 },
    pcr: { name: 'PCR Machine', cost: 15000, baseProduction: 2.0 },
    sequencer: { name: 'Gene Sequencer', cost: 50000, baseProduction: 4.0 },
    spectrometer: { name: 'Mass Spec', cost: 75000, baseProduction: 5.0 },
    accelerator: { name: 'Particle Accelerator', cost: 200000, baseProduction: 10.0 }
  },

  // ==================== RESEARCH BRANCHES ====================
  researchBranches: [
    {
      key: 'biology',
      name: 'Biology',
      color: 0x4ecdc4,
      nodes: [
        { name: 'Cell Culture', cost: 50, unlock: 'centrifuge', desc: 'Growing cells in dishes (Congress thinks we\'re making soup)' },
        { name: 'Molecular Biology', cost: 150, unlock: 'pcr', desc: 'Too small for senators to see, therefore suspicious' },
        { name: 'Genomics', cost: 400, unlock: 'sequencer', desc: '"Basically just reading letters" - actual congressional quote' },
        { name: 'Synthetic Biology', cost: 1000, unlock: null, desc: 'Playing God (pending regulatory approval)' }
      ]
    },
    {
      key: 'chemistry',
      name: 'Chemistry',
      color: 0xff6b6b,
      nodes: [
        { name: 'Analytical Chemistry', cost: 50, unlock: null, desc: 'Measuring things politicians don\'t understand' },
        { name: 'Organic Synthesis', cost: 150, unlock: null, desc: 'Making molecules that already exist in nature (somehow evil)' },
        { name: 'Mass Spectrometry', cost: 400, unlock: 'spectrometer', desc: 'Very expensive scale (auditors hate this one)' },
        { name: 'Medicinal Chemistry', cost: 1000, unlock: null, desc: 'Drug discovery (the legal kind, we promise)' }
      ]
    },
    {
      key: 'physics',
      name: 'Physics',
      color: 0xffd93d,
      nodes: [
        { name: 'Classical Mechanics', cost: 50, unlock: null, desc: 'Old science, therefore trustworthy to boomers' },
        { name: 'Quantum Mechanics', cost: 150, unlock: null, desc: 'Spooky action at a distance (defunded for being scary)' },
        { name: 'Nuclear Physics', cost: 400, unlock: null, desc: 'Not for weapons (please don\'t audit us)' },
        { name: 'Particle Physics', cost: 1000, unlock: 'accelerator', desc: 'Finding particles nobody asked for since 1964' }
      ]
    },
    {
      key: 'engineering',
      name: 'Engineering',
      color: 0x95e1d3,
      nodes: [
        { name: 'Lab Automation', cost: 50, unlock: null, desc: 'Robots doing your job (RIF incoming)' },
        { name: 'Robotics', cost: 150, unlock: null, desc: 'Teaching machines to replace postdocs' },
        { name: 'Machine Learning', cost: 400, unlock: null, desc: 'Required buzzword for any grant application' },
        { name: 'Quantum Computing', cost: 1000, unlock: null, desc: 'The word "quantum" adds $1M to any budget' }
      ]
    }
  ],

  // ==================== MENU CONTENT ====================
  menuTaglines: [
    // Political satire
    '"Do Your Own Research" - New NIH Motto',
    'Now with 94% more DOGE audits!',
    'RFK Jr Approved* (*not scientifically)',
    '"Nobody knows more about science than me" - You Know Who',
    'Make Academia Great Again!',
    'Defunded by popular demand!',
    // Academia dystopia
    'Where PhDs Go to Become Adjuncts!',
    '7 Years of Poverty: A Simulation',
    'Publish or Perish (Mostly Perish)',
    '"Just One More Revision" - Your Advisor',
    'Experience Real Academic Exploitation!',
    'Featuring Authentic Imposter Syndrome!',
    'Now With 200% More Unpaid Labor!',
    'Tenure: The Myth, The Legend',
    'Simulating Poverty Since 2024',
    'Your Student Loans Will Never Be Paid',
    '"Almost Ready to Graduate" - Year 12',
    'Where Dreams Go to Get Rejected'
  ],

  menuWarnings: [
    // Political
    '* Side effects may include: DOGE audits, presidential tweets, and existential dread',
    '* Grant funding subject to change based on who the President is mad at today',
    '* This game has not been reviewed by RFK Jr (thank God)',
    '* Not endorsed by any actual government agency (they have been defunded)',
    // Academia dystopia
    '* No graduate students were paid a living wage in the making of this game',
    '* Side effects may include: poverty, imposter syndrome, and questioning all life choices',
    '* Adjunct professors depicted are based on real exploitation. This is not satire.',
    '* Your advisor has not responded to your email. They will never respond.',
    '* The faculty job you applied for received 847 applications',
    '* Warning: Game accurately simulates academic mental health crisis',
    '* Stipends depicted have not been adjusted for inflation since 1997',
    '* Any resemblance to your actual PhD experience is intentional and we are sorry',
    '* The tenure track position has been converted to 3 adjunct positions',
    '* Your student loans are accruing interest as you read this'
  ],

  menuEditions: [
    'v1.0.0 (Unfunded Edition)',
    'v1.0.0 (Adjunct Poverty Edition)',
    'v1.0.0 (Tenure Denied Edition)',
    'v1.0.0 (Reviewer #2 Was Mean Edition)',
    'v1.0.0 (Dreams Crushed Edition)',
    'v1.0.0 (Student Loan Accruing Edition)'
  ],

  hireTaglines: [
    '"Will Work for Grant Money"',
    '"Exploiting Dreams Since 1088 AD"',
    '"Where PhDs Come to Die"',
    '"Cheaper Than Automation (For Now)"',
    '"Why Pay Living Wages?"',
    '"Fresh Meat for the Academic Mill"',
    '"Your Suffering, Our Publications"',
    '"H-Index > Human Rights"'
  ],

  loadingMessages: [
    'Simulating DOGE audit...',
    'Calibrating RFK Jr suspicion levels...',
    'Generating presidential tweets...',
    'Loading alternative facts...',
    'Initializing Facebook peer review...',
    'Brewing raw milk...',
    'Compiling ivermectin studies...',
    'Defunding climate research...',
    'Scheduling loyalty oath signing...',
    'Consulting Joe Rogan archives...',
    'Flagging research as "wasteful"...',
    'Replacing scientists with podcasters...',
    'Making science great again...',
    'Investigating windmill cancer...',
    'Banning the word "climate"...',
    'Appointing MyPillow guy...',
  ],

  // ==================== HELPER FUNCTIONS ====================
  getRandomHeadline() {
    return this.newsHeadlines[Math.floor(Math.random() * this.newsHeadlines.length)];
  },

  getRandomCrisis() {
    return this.crisisEvents[Math.floor(Math.random() * this.crisisEvents.length)];
  },

  getRandomGrantAgency() {
    return this.grantAgencies[Math.floor(Math.random() * this.grantAgencies.length)];
  },

  getRandomRejection() {
    return this.rejectionReasons[Math.floor(Math.random() * this.rejectionReasons.length)];
  },

  getRandomTagline() {
    return this.menuTaglines[Math.floor(Math.random() * this.menuTaglines.length)];
  },

  getRandomWarning() {
    return this.menuWarnings[Math.floor(Math.random() * this.menuWarnings.length)];
  },

  getRandomEdition() {
    return this.menuEditions[Math.floor(Math.random() * this.menuEditions.length)];
  },

  getRandomHireTagline() {
    return this.hireTaglines[Math.floor(Math.random() * this.hireTaglines.length)];
  },

  getRandomLoadingMessage() {
    return this.loadingMessages[Math.floor(Math.random() * this.loadingMessages.length)];
  },

  getScientistName(type) {
    const names = this.scientistNames[type] || this.scientistNames.biologist;
    return names[Math.floor(Math.random() * names.length)];
  },

  getRandomTraits(count, traitPool = this.scientistTraits) {
    const traits = [];
    const usedIndices = new Set();
    const max = Math.min(count, traitPool.length);

    for (let i = 0; i < max; i++) {
      let index;
      do {
        index = Math.floor(Math.random() * traitPool.length);
      } while (usedIndices.has(index));
      usedIndices.add(index);
      traits.push(traitPool[index].name);
    }

    return traits;
  },

  // Get equipment data by type
  getEquipmentData(type) {
    const data = this.equipmentTypes[type];
    if (!data) return null;
    return {
      type: type,
      name: data.name,
      cost: data.cost,
      bonus: Math.floor(data.baseProduction * 10)
    };
  },

  // Get all equipment for shop
  getAllEquipment() {
    const equipment = [
      { type: 'microscope', name: 'Microscope', cost: 5000, bonus: 10, unlockText: 'Basic' },
      { type: 'computer', name: 'Computer', cost: 3000, bonus: 8, unlockText: 'Basic' },
      { type: 'centrifuge', name: 'Centrifuge', cost: 8000, bonus: 15, unlockText: 'Biology Level 1' },
      { type: 'pcr', name: 'PCR Machine', cost: 15000, bonus: 20, unlockText: 'Biology Level 2' },
      { type: 'sequencer', name: 'Gene Sequencer', cost: 50000, bonus: 40, unlockText: 'Biology Level 3' },
      { type: 'spectrometer', name: 'Mass Spectrometer', cost: 75000, bonus: 50, unlockText: 'Chemistry Level 3' }
    ];
    return equipment;
  },

  // Generate a random scientist
  generateScientist() {
    const types = ['biologist', 'chemist', 'physicist', 'engineer'];
    const type = types[Math.floor(Math.random() * types.length)];
    const typeData = this.scientistTypes[type];

    return {
      name: this.getScientistName(type),
      type: typeData.name,
      typeKey: type,
      skill: Math.floor(Math.random() * 7) + 3, // 3-10 skill
      traits: this.getRandomTraits(2)
    };
  },

  // Get research branches data
  getResearchBranches() {
    return {
      biology: {
        name: 'Biology',
        color: '#4ecdc4',
        levels: [
          'Cell Culture: Grow cells in dishes',
          'Molecular Biology: Study DNA/RNA',
          'Genomics: Sequence genomes',
          'Synthetic Biology: Design life',
          'MAXED: You are become god'
        ]
      },
      chemistry: {
        name: 'Chemistry',
        color: '#ff6b6b',
        levels: [
          'Analytical: Measure stuff',
          'Organic: Make molecules',
          'Mass Spec: Weigh molecules',
          'Medicinal: Make drugs (legal)',
          'MAXED: Breaking Bad achieved'
        ]
      },
      physics: {
        name: 'Physics',
        color: '#ffd93d',
        levels: [
          'Classical: Newton approved',
          'Quantum: Spooky action',
          'Nuclear: Not for bombs',
          'Particle: Smash atoms',
          'MAXED: String theory unlocked'
        ]
      },
      engineering: {
        name: 'Engineering',
        color: '#95e1d3',
        levels: [
          'Automation: Robots do work',
          'Robotics: Better robots',
          'Machine Learning: AI hype',
          'Quantum Computing: Buzzword',
          'MAXED: Skynet imminent'
        ]
      }
    };
  },

  // Get research unlocks
  getResearchUnlocks(branch, level) {
    const unlocks = {
      biology: {
        1: ['centrifuge'],
        2: ['pcr'],
        3: ['sequencer']
      },
      chemistry: {
        3: ['spectrometer']
      },
      physics: {},
      engineering: {}
    };

    return (unlocks[branch] && unlocks[branch][level]) || null;
  },

  // Get academia worker types
  getAcademiaWorkerTypes() {
    return [
      { key: 'grant_writer', name: 'Grant Writer', description: '+2% grant success per skill point', baseCost: 8000, effect: 'Increases grant approval chance' },
      { key: 'lab_manager', name: 'Lab Manager', description: 'Reduces equipment costs (coming soon)', baseCost: 10000, effect: 'Future: reduce maintenance' },
      { key: 'technician', name: 'Lab Technician', description: 'Boosts equipment efficiency (coming soon)', baseCost: 6000, effect: 'Future: equipment bonus' },
      { key: 'admin', name: 'Administrator', description: 'Handles paperwork (coming soon)', baseCost: 5000, effect: 'Future: reduce overhead' }
    ];
  },

  // Get random academia worker name
  getRandomAcademiaName() {
    const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Sam', 'Pat', 'Chris', 'Jamie'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Martinez', 'Wilson'];
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  },

  // Get grant agencies
  getGrantAgencies() {
    return [
      { name: 'NIH (Now Incredibly Hindered)', successRate: 8, minAward: 30000, maxAward: 100000 },
      { name: 'NSF (No Science Funding)', successRate: 5, minAward: 20000, maxAward: 50000 },
      { name: 'RFK Jr Wellness Foundation', successRate: 25, minAward: 5000, maxAward: 15000 },
      { name: 'MAGA Science Initiative', successRate: 30, minAward: 10000, maxAward: 25000 },
      { name: 'Tech Billionaire Whim Fund', successRate: 1, minAward: 500000, maxAward: 2000000 }
    ];
  },

  // Get random crisis (reformatted for GameScene)
  getRandomCrisis() {
    const crisis = this.crisisEvents[Math.floor(Math.random() * this.crisisEvents.length)];
    return {
      title: crisis.title,
      description: crisis.message,
      responses: crisis.responses.map(r => ({
        text: r.text,
        effect: crisis.effect
      }))
    };
  }
};

export default ContentData;
